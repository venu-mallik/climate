import { useCallback, useMemo, useEffect, useState } from 'react';
import { Col, Row, Select, Layout, Table, Menu, Tag, InputNumber, Tooltip } from 'antd';
import { countryList } from '@/components/countriesList';
import { getDistanceFromLatLonInKm } from '@/components/utils';
import { HomeComponent } from '@/components/home';
import { ClimateComponent } from '@/components/climate';
import { SoundComponent } from '@/components/mantras';

const isSSREnabled = () => typeof window === 'undefined';

function getPresets(){

  let p = [{country :"Top250"},{ country:"Top100"}, { country : "Top50"}]

  for(let i = 0; i < 100; i = i + 5 ){
      let j = i+5;
      p.push({ country : `$Range_${i*100000}_${(j)*100000}`})
  }
  p.push({ country : `$Range_0_100000`})
  p.push({ country : `$Range_5000000_100000000`})
  return p;
}

const presets = getPresets();

export default function Home() {

  const apiURL = "https://citygrid.vrworkers.workers.dev";
  const [activeTab,setActiveTab] = useState(1);
  const [plotType,setPlotType] = useState("bubble");
  const [data, setData] = useState([]);
  const [cities,setCities] = useState([]);
  const [country,setCountry] = useState("India");
  const [selectedCity, setselectedCity] = useState({name: "Vijayawada", lat: 16, lon: 80, elevation : 30, timezone: "Asia/Kolkata" });

  const [css,setCss] = useState({ card : { width : "75vw"}})

  useEffect(()=>{
    if(window.innerWidth.toFixed(0) < 600){
      setCss( { card : { width : "100vw"}});
    }

    const getCountryData = async () => {
      const resp = await fetch(`${apiURL}/api/country?country=${country}`);
      const postResp = await resp.json();
      setCities(postResp);
      setselectedCity(postResp[0]);
      
    };

  getCountryData();

  },[country])


  useEffect(() => {

    if (window && cities.length > 0) {
      let contain = []
      let activeCity = cities.filter((a) => a.name === selectedCity.name);
      activeCity = activeCity && "length" in activeCity ? activeCity[0] : cities[0];
      let tcoor = { lat: activeCity.lat, lon: activeCity.lon }; 
      cities.map((rec) => {
        let d = getDistanceFromLatLonInKm(tcoor.lat, tcoor.lon, rec.lat, rec.lon);          
          contain.push({
            'city1': rec.name, 'pop1': rec.population, 'pop2': activeCity.population,
            'distance': Number(d).toFixed(2), 'city2': activeCity.name,
            'lat1': rec.lat, 'lon1': rec.lon 
          });
      contain.sort((a,b) => a.distance - b.distance)
      setData(contain);
    });
  }

  },[ selectedCity])

  function onChangeTable(pagination, filters, sorter, extra) {
    let col = sorter.field;
    let dat = data.sort((a, b) => a[col] - b[col])
    setData(dat);
  }

  useEffect(()=>{

    if(true)
      return;

    let qs = `samelat?lat=${selectedCity.lat}`;
    if(selectedCity.lat === null)
      qs = `samelon?lon=${selectedCity.lon}`
    const bylatlon = async () => {
      const resp = await fetch(`${apiURL}/api/${qs}`);
      const postResp = await resp.json();
      setCities(postResp);
    };

  bylatlon();
},[])

  return ( 
            !isSSREnabled() ?
            <>   
              <Layout>
            <div className="demo-logo" />
            <Menu theme="dark" mode="horizontal" defaultSelectedKeys={[activeTab]} 
            items={[
              {key: 1, label: 'Home'},
              {key: 2, label: 'Climate'},
              {key: 3, label: 'Distances'},
              {key: 4, label: 'Music & Frequency'}
            ]}
              onClick={(e) => { setActiveTab(e.key) }} />
          <Layout.Content>

                  <Select style={{ width: 300 }} title={"Select the country"}
                  placeholder={'Select Range/Top/Country'} allowClear showSearch
                  value={country} onChange={(v) => setCountry(v)} >
                  { 

                   [...presets ,...countryList].map((b, _) => {
                    return <Select.Option key={b.country} >{b.country}</Select.Option>
                  })}
                </Select>
                <Select style={{ width: 200 }} title={"Select the city from which you want to measure"}
                  placeholder={'Select City'} allowClear showSearch
                  value={selectedCity.name} onChange={(v) => {setselectedCity(JSON.parse(v));  }} >
                  {cities.map((b, _) => {
                    return <Select.Option key={b.name} value={JSON.stringify(b)} >{b.name}</Select.Option>
                  })}
                </Select> 
                {/*<Select style={{ width: 100 }} placeholder={"Select population limit"} value={pop}
                title={"Filter the cities by population limit"}
                  onChange={(v) => setPop(v)}>
                  {
                    [1000, 2000, 5000, 10000, 15000, 25000, 50000, 75000, 100000, 200000, 500000, 1000000,1500000, 2000000,
                    3300000, 4000000, 5000000, 6600000, 8800000].map((b) => {
                      return <Select.Option key={b}>{b}</Select.Option>
                    })}
                </Select> */}

                <br></br>
                {activeTab == 1 && <HomeComponent data={cities} country={country}  css={css} />}
                {activeTab == 2 && <ClimateComponent data={cities} country={country} selectedCity={selectedCity} css={css}/>}
                {activeTab == 4 && <SoundComponent /> }

                { activeTab == 3 && 
                <Table dataSource={data} onChange={onChangeTable} >
                  <Table.Column dataIndex={'city1'} title={'city1'} filterIcon filterSearch></Table.Column>
                  <Table.Column dataIndex={'city2'} title={'city2'} render={(v, _) => v} ></Table.Column>
                  <Table.Column dataIndex={'pop1'} title={'pop1'} render={(v, _) => v}
                    sorter={true} sortDirections={['ascend' | 'descend']} showSorterTooltip sortOrder='descend'></Table.Column>
                  <Table.Column dataIndex={'pop2'} title={'pop2'} render={(v, _) => v}   ></Table.Column>

                  <Table.Column dataIndex={'distance'} title={'distance'} render={(v, _) => v}
                    sorter={true} sortOrder='ascend' sortDirections={['ascend' | 'descend']} ></Table.Column>

                </Table> }
          
                </Layout.Content>
                </Layout>
              </>: null
  )
}
