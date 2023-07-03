import { useCallback, useMemo, useEffect, useState } from 'react';
import { Col, Row, Select, Layout, Table, Menu, Tag, InputNumber, Tooltip } from 'antd';
import { SunPosition ,AngleFromSun, SearchRiseSet, Observer, AstroTime  }  from 'astronomy-engine';
import vegaEmbed from 'vega-embed';


const isSSREnabled = () => typeof window === 'undefined';

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

var map;

function runPlot(from , data, type ){

  let slice = {"bubble": undefined, "line": 15, "polygon": 10}
  if (map) { 
    map = map.off();
    map = map.remove(); } 
  
    map = L.map('map', {
      center: [from.lat, from.lon],
      zoom: 3
    });
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 12
    }).addTo(map);

    data.slice(0, slice[type]).map((b,i)=>{
      let line = [[from.lat, from.lon], [b.lat1, b.lon1]];
        if(["line"].includes(type))
        {
          L.polyline(line, {color: 'red'}).addTo(map).bindTooltip(
          `${b.city1}-${Number(b.distance).toFixed(0)} KM`, 
          {offset: [-100, i*10], sticky : false, permanent : true}).openTooltip();
        
          L.circle([b.lat1 , b.lon1]
            ,{
              color: 'red',
              fillColor: '#f03',
              fillOpacity: 1/(b.pop1),
              radius: 0.0005*b.pop1
          }).addTo(map)
        }

        if(["bubble"].includes(type))
        {
        L.circle([b.lat1 , b.lon1]
          ,{
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 1/(b.pop1),
            radius: 0.0005*b.pop1
        }).addTo(map).bindPopup(
          `${b.city1}-${Number(b.pop1).toFixed(0)}`).openPopup();
        }
    });
}


function runVegaPlotYearlySunHour(body){

  var vlSpec = {
    width: 500,
    height: 300,
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: body
    },
    "repeat": { "layer": ['moonhour','sunhour','vitd-fair','vitd-dark']},
    "spec":{
    "mark": {"type":"point", "tooltip": true },
    "encoding": {
      "x": {"type": "temporal", "field": "time"},
      "y": { "field": {"repeat": "layer"}, "type": "quantitative" , 
             "axis": {"values": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]}
          },
      "color": {"datum": {"repeat": "layer"}, "type": "nominal"}, 
    }
  }
  };
  vegaEmbed('#vis', vlSpec);

  var vlSpec1 = {
    width: 500,
    height: 300,
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: body
    },

    "mark": "area",
    "encoding": {
      "x": {"type": "temporal", "field": "time"},
      "y": {
        "title": "Daily Sunrise",
        "field": "sunriseh",
        "type": "quantitative"  
      },
      "y2": { "field": "sunseth" ,
      "type": "quantitative"},
    }
  };

  // Embed the visualization in the container with id `vis`
  //vegaEmbed('#vis1', vlSpec1); 



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
  const [plotType,setPlotType] = useState("bubble");
  const [data, setData] = useState([]);
  const [cities,setCities] = useState([]);
  const [countries,setCountries] = useState([{"country": "India"}])
  const [country,setCountry] = useState("India");
  const [cityData,setCityData] = useState({});
  const [riseData,setRiseData] = useState([]);
  const [selectedCity, setselectedCity] = useState({name: "Vijayawada", lat: 16, lon: 80, elevation : 30 });
  const [pop, setPop] = useState(500000);

  useEffect(()=>{
    let con = localStorage.getItem("countryList")
    if(con){
      setCountries(JSON.parse(con))
    }
    else{
        const getCountries = async () => {
          const resp = await fetch(`${apiURL}/api/countries`);
          const postResp = await resp.json();
          localStorage.setItem("countryList",JSON.stringify(postResp));
          setCountries(postResp);
        };
        getCountries();
    }
  },[])


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
      console.log(activeCity, cities);
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
      runPlot(selectedCity, contain, plotType);
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
      data.push(
              { 
                'time' : now,
                'sunrise' : sunrise?.date, 'sunset' : sunset?.date ,
                  'moonrise' : moonrise?.date, 'moonset' : moonset?.date,
                  'sunhour' : sh,
                  'moonhour' : mh,
                  "vitd-fair": UVBOOK[uvi]*100/sh,
                  "vitd-dark":  UVBOOK[uvi]*100*2/sh
              }
          )
      });
      setRiseData(data);
      runVegaPlotYearlySunHour(data);
    },[cityData])

  const getClimate = useCallback(async ()=>{
      const resp = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=995118c2fcf34632a75113058230307&q=${selectedCity.lat},${selectedCity.lon}&aqi=yes
      `);
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
                <Select style={{ width: 200 }} title={"Select the plot type"}
                  placeholder={'Plot type'} allowClear showSearch
                  value={plotType} onChange={(v) => {setPlotType(v); runPlot(selectedCity,data,v); }} >
                  { 
                   [{ type : "bubble"}, {type : "line"}, {type : "polygon"} ].map((b, _) => {
                    return <Select.Option key={b.type} >{b.type}</Select.Option>
                  })}
                </Select>

                  <Select style={{ width: 300 }} title={"Select the country"}
                  placeholder={'Select Range/Top/Country'} allowClear showSearch
                  value={country} onChange={(v) => setCountry(v)} >
                  { 

                   [...presets ,...countries].map((b, _) => {
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
                <Select style={{ width: 100 }} placeholder={"Select population limit"} value={pop}
                title={"Filter the cities by population limit"}
                  onChange={(v) => setPop(v)}>
                  {
                    [1000, 2000, 5000, 10000, 15000, 25000, 50000, 75000, 100000, 200000, 500000, 1000000,1500000, 2000000,
                    3300000, 4000000, 5000000, 6600000, 8800000].map((b) => {
                      return <Select.Option key={b}>{b}</Select.Option>
                    })}
                </Select>
                
                { 'forecast' in cityData ? JSON.stringify(cityData['forecast']['forecastday'][0]['day']) : null}

                <div style={{display : "inline-flex"}}>
                <div id="map" style={{ height: 300 , width : 500 }} title={ `${selectedCity.name} Sunlight Availability`}></div>
                <div id="vis"></div>
                </div>
                <div style={{display : "inline-flex"}}>
                <div id="vis1"></div>
                </div>
                <Table dataSource={data} onChange={onChangeTable} >
                  <Table.Column dataIndex={'city1'} title={'city1'} filterIcon filterSearch></Table.Column>
                  <Table.Column dataIndex={'city2'} title={'city2'} render={(v, _) => v} ></Table.Column>
                  <Table.Column dataIndex={'pop1'} title={'pop1'} render={(v, _) => v}
                    sorter={true} sortDirections={['ascend' | 'descend']} showSorterTooltip sortOrder='descend'></Table.Column>
                  <Table.Column dataIndex={'pop2'} title={'pop2'} render={(v, _) => v}   ></Table.Column>

                  <Table.Column dataIndex={'distance'} title={'distance'} render={(v, _) => v}
                    sorter={true} sortOrder='ascend' sortDirections={['ascend' | 'descend']} ></Table.Column>

                </Table>

              </>: null
  )
}
