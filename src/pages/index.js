import { useCallback, useMemo, useEffect, useState } from 'react';
import { Col, Row, Select, Layout, Table, Menu, Tag, InputNumber, Tooltip } from 'antd';
import { countryList } from '@/components/countriesList';
import { apiURL } from '@/components/utils';
import { MagneticComponent } from '@/components/magnetic';
import { ClimateComponent } from '@/components/climate';
import { DistanceComponent } from '@/components/distances';
import { MediaComponent, SoundComponent } from '@/components/health';
import {AstroScales} from '@/components/astrotime';
import { TimeScales } from '@/components/timescale';

const topoapiKey = "7ff2ac7dc86df81348678acb072ce0c0";

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

  const [activeTab,setActiveTab] = useState(1);
  const [cities,setCities] = useState([]);
  const [country,setCountry] = useState("India");
  const [selectedCity, setselectedCity] = useState({name: "Vijayawada", lat: 16, lon: 80, elevation : 30, timezone: "Asia/Kolkata" });


  useEffect(()=>{

    const getCountryData = async () => {
      const resp = await fetch(`${apiURL}/api/country?country=${country}`);
      const postResp = await resp.json();
      setCities(postResp);
      setselectedCity(postResp[0]);
      
    };

  getCountryData();

  },[country])

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
              {key: 2, label: 'Magnetic'},
              {key: 1, label: 'Climate'},
              {key: 3, label: 'Distances'},
              {key: 5, label: 'Astronomy'},
              {key: 4, label: 'Health Media'},
              {key: 6, label: 'Time Scales'}
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
                {activeTab == 2 && <MagneticComponent data={cities} country={country}   />}
                {activeTab == 1 && <ClimateComponent data={cities} country={country} selectedCity={selectedCity} />}
                {activeTab == 4 && <MediaComponent /> }

                { activeTab == 3 && 
                  <DistanceComponent data={cities} country={country} selectedCity={selectedCity}/> }
                
                { activeTab == 5 && 
                  <AstroScales selectedCity={selectedCity}/> }
                { activeTab == 6 && 
                  <TimeScales selectedCity={selectedCity}/> }
                </Layout.Content>
                </Layout>
              </>: null
  )
}
