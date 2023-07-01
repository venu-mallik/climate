import { useEffect, useState } from 'react';
import { Col, Row, Select, Layout, Table, Menu, Tag, InputNumber, Tooltip } from 'antd';


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

  let slice = {"bubble": 50, "line": 20, "polygon": 10}
  if (map) { 
    map = map.off();
    map = map.remove(); } 
  
    map = L.map('map', {
      center: [from.lat, from.lon],
      zoom: 8
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
        }).addTo(map).bindTooltip(
          `${b.city1}-${Number(b.pop1).toFixed(0)}`, 
          {offset: [-10, i*10], sticky : false, permanent : true}).openTooltip();; 
        }
    });

}

export default function Home() {

  const apiURL = "https://citygrid.vrworkers.workers.dev";
  const [plotType,setPlotType] = useState("bubble");
  const [data, setData] = useState([]);
  const [cities,setCities] = useState([]);
  const [countries,setCountries] = useState([{"country": "India"}])
  const [country,setCountry] = useState("India")
  const [selectedCity, setselectedCity] = useState({name: "Vijayawada", lat: 16, lon: 80 });
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
      setselectedCity( country === "India" ? {name: "Vijayawada", lat: 16, lon: 80 } : postResp[0]);
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
            'distance': d, 'city2': activeCity.name,
            'lat1': rec.lat, 'lon1': rec.lon
          })
      })
      contain.sort((a,b) => a.distance - b.distance)
      setData(contain);
      runPlot(selectedCity, contain, plotType);
    }

  }, [selectedCity, cities, pop])


  function onChangeTable(pagination, filters, sorter, extra) {
    console.log('params', sorter, extra);
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

                <h4>Plot the geographically nearest cities to a town or city and above a population threshold</h4>
                <Select style={{ width: 200 }} title={"Select the plot type"}
                  placeholder={'Plot type'} allowClear showSearch
                  value={plotType} onChange={(v) => {setPlotType(v); runPlot(selectedCity,data,v); }} >
                  { 
                   [{ type : "bubble"}, {type : "line"}, {type : "polygon"} ].map((b, _) => {
                    return <Select.Option key={b.type} >{b.type}</Select.Option>
                  })}
                </Select>

                  <Select style={{ width: 200 }} title={"Select the country"}
                  placeholder={'Select Country'} allowClear showSearch
                  value={country} onChange={(v) => setCountry(v)} >
                  { 
                   countries.map((b, _) => {
                    return <Select.Option key={b.country} >{b.country}</Select.Option>
                  })}
                </Select>
                <Select style={{ width: 200 }} title={"Select the city from which you want to measure"}
                  placeholder={'Select City'} allowClear showSearch
                  value={selectedCity.name} onChange={(v) => setselectedCity(JSON.parse(v))} >
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

                <div id="map" style={{ height: 600 }}></div>
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
