import { useCallback, useMemo, useEffect, useState } from 'react';
import { Col, Row, Select, Layout, Table, Menu, Tag, InputNumber, Tooltip } from 'antd';
import {  SearchRiseSet, Observer, AstroTime  }  from 'astronomy-engine';
import vegaEmbed from 'vega-embed';
import { countryList } from '@/components/countriesList';
import { getDistanceFromLatLonInKm } from '@/components/utils';
import { HomeComponent } from '@/components/home';
import spacetime from 'spacetime';

const isSSREnabled = () => typeof window === 'undefined';


function runVegaPlotYearlySunHour(body){

  var vlSpec = {
    title : {"text": "Vitamin-D availability and requirement", 
  "subtitle" : " daytime : availability , vitd-fair/dark : percent daytime exposure needed in sunlight "},
    width: "container",
    height: "container",
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: body
    },
    "repeat": { "layer": ['daytime','vitd-fair','vitd-dark']},
    "spec":{
    "mark": {"type":"point", "tooltip": true },
    "encoding": {
      "x": {"type": "temporal", "field": "time"},
      "y": { "field": {"repeat": "layer"}, "type": "quantitative" , 
             "axis": {"values": [5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,100]}
          },
      "color": {"datum": {"repeat": "layer"}, "type": "nominal"}, 
    }
  }
  };
  vegaEmbed('#vis', vlSpec);

  var vlSpec1 = {
    title : {"text": "Sun and Moon above the horizon", 
      "subtitle" : "Do we really know, how the moon presence above horizon and its gravity impact us? "},
    width: 'container',
    height: 'container',
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: body
    },
    "encoding": {
      "x": {"type": "temporal", "field": "time"}
    },
    "layer": [
      { 
        "mark": {"opacity": 0.5, "type": "area", "color": "orange"},
            "encoding": { "y": {
              "title": "Daily Sun above horizon",
              "field": "sunrise",
              "type": "temporal", 
              "timeUnit": "utchoursminutes"
            },
            "y2": { 
              "timeUnit": "utchoursminutes"  ,
              "field": "sunset" ,
              "type": "temporal"
            },
          }
      },
      {  
        "mark": {"opacity": 0.5, "type": "area", "color": "blue"},
        "encoding": {
            "y": {
              "title": "Daily Moon above horizon",
              "field": "moonrise",
              "type": "temporal", 
              "timeUnit": "utchoursminutes"
            },
            "y2": { 
              "timeUnit": "utchoursminutes"  ,
              "field": "moonset" ,
              "type": "temporal"
            },
        }
      }
    ],
    "resolve": {"scale": {"y": "independent"}}
  };
  // Embed the visualization in the container with id `vis`
  vegaEmbed('#vis1', vlSpec1); 

}

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

const UVBOOK = { 1 : 0, 2 : 0 , 3 : 1.2, 4 : 1.2, 5 : 1.2, 6: 0.75, 7 : 0.75, 8 : 0.5, 9: 0.5 , 10 : 0.3 , 11: 0.3}

export default function Home() {

  const apiURL = "https://citygrid.vrworkers.workers.dev";
  const [activeTab,setActiveTab] = useState(1);
  const [plotType,setPlotType] = useState("bubble");
  const [data, setData] = useState([]);
  const [cities,setCities] = useState([]);
  const [country,setCountry] = useState("India");
  const [cityData,setCityData] = useState({});
  const [riseData,setRiseData] = useState([]);
  const [selectedCity, setselectedCity] = useState({name: "Vijayawada", lat: 16, lon: 80, elevation : 30, timezone: "Asia/Kolkata" });
  const [pop, setPop] = useState(500000);

  useEffect(()=>{
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
        if (rec.population > pop)
          contain.push({
            'city1': rec.name, 'pop1': rec.population, 'pop2': activeCity.population,
            'distance': Number(d).toFixed(2), 'city2': activeCity.name,
            'lat1': rec.lat, 'lon1': rec.lon 
          })
      })
      contain.sort((a,b) => a.distance - b.distance)
      setData(contain);
    }

  }, [ selectedCity])

  useEffect(()=>{
    let data = []
    if("current" in cityData === false)
      return;
    let uvi = cityData['forecast']['forecastday'][0]["day"]["uv"]
    const obs = new Observer( selectedCity.lat, selectedCity.lon, 
      Number(selectedCity.elevation) === 'NaN' || Number(selectedCity.elevation) === -9999
    ? 0 : Number(selectedCity.elevation) );
    let times = []
    const time = new AstroTime(new Date(`${new Date().getFullYear()}-01-01`));
    Array(365).fill().map((_, index) => {
      times.push(time.AddDays(index))
    })

    Object.values(times).map((now, index) => {
    let sunrise = SearchRiseSet("Sun", obs, 1 , now, 1  )
    let sunset = SearchRiseSet("Sun", obs, -1 , sunrise ? sunrise : now , 1  )
    let moonrise = SearchRiseSet("Moon", obs, 1 , now, 1  )
    let moonset = SearchRiseSet("Moon", obs, -1 , moonrise ? moonrise : now, 1  )  
    let sh = Number(Math.abs(sunset?.date.getTime() - sunrise?.date.getTime() )/36e5).toFixed(2);
    let mh = Number(Math.abs(moonset?.date.getTime() - moonrise?.date.getTime())/36e5).toFixed(2);
    sunrise = spacetime(sunrise?.date.toISOString()).goto(selectedCity.timezone).iso();
    sunset = spacetime(sunset?.date.toISOString()).goto(selectedCity.timezone).iso();
    sunrise = sunrise.charAt(23) === "Z" ? sunrise : sunrise.slice(0,-6) + "Z"
    sunset = sunset.charAt(23) === "Z" ? sunset : sunset.slice(0,-6) + "Z"
    moonrise = spacetime(moonrise?.date.toISOString()).goto(selectedCity.timezone).iso();
    moonset = spacetime(moonset?.date.toISOString()).goto(selectedCity.timezone).iso();
    moonrise = moonrise.charAt(23) === "Z" ? moonrise : moonrise.slice(0,-6) + "Z"
    moonset = moonset.charAt(23) === "Z" ? moonset : moonset.slice(0,-6) + "Z"
    data.push(
              { 
                'time' : now,
                'sunrise' : sunrise, 'sunset' : sunset ,
                  'moonrise' : moonrise, 'moonset' : moonset,
                  'sunhour' : sh,
                  'moonhour' : mh,
                  "vitd-fair": UVBOOK[uvi]*100/sh,
                  "vitd-dark":  UVBOOK[uvi]*100*2/sh ,
                  "daytime" : sh*100/24
              }
          )
      });
      setRiseData(data);
      runVegaPlotYearlySunHour(data);
    },[cityData])

  const getClimate = useCallback(async ()=>{
      const resp = await fetch(`${apiURL}/api/weather?lat=${selectedCity.lat}&lon=${selectedCity.lon}`)
      const postResp = await resp.json();
      console.log(postResp);
      setCityData(postResp);
  },[selectedCity])

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
              {key: 3, label: 'Explorer'}
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
                  value={selectedCity.name} onSelect={getClimate} onChange={(v) => {setCityData({});setselectedCity(JSON.parse(v));  }} >
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
                {activeTab == 1 && <HomeComponent data={cities} country={country}/>}
                <br></br>
                <div style={{display : "inline-flex"}}>
                <div id="vis"  style={{display: activeTab == 2 ? "block": "none", width: "50vw", height: "65vh"}}></div>
                <div id="vis1"  style={{display: activeTab == 2 ? "block": "none", width: "50vw", height: "65vh"}}></div>
                </div>
                <br></br>
                { 'forecast' in cityData  && 'forecastday' in cityData['forecast'] &&
              'day' in cityData['forecast']['forecastday'][0] ?
                Object.entries(cityData['forecast']['forecastday'][0]['day']).map(([k,v],_) =>{
                  
                    return  k == "air_quality" ? null : <Tag  >{k}:{ JSON.stringify(v)}</Tag>
                }) : "Select a city"}
                
              { 'forecast' in cityData  && 'forecastday' in cityData['forecast'] &&
              'day' in cityData['forecast']['forecastday'][0] && 'air_quality' in cityData['forecast']['forecastday'][0]['day']
              ? 
              Object.entries(cityData['forecast']['forecastday'][0]['day']['air_quality']).map(([k,v],_) =>{
                  
                  return  k == "air_quality" ? null : <Tag  >{k}:{ JSON.stringify(v)}</Tag>
              }) : ""}
                <br></br>
                
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
