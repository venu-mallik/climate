import { useEffect, useLayoutEffect, useState } from "react";
import { getDistanceFromLatLonInKm } from "./utils";
import { Button, Card, Select, Table, InputNumber } from "antd";
import vegaEmbed from 'vega-embed';
var map;
var map1;
function runProximity(from, radius){
    let divvisible = document.getElementById("map1");
    if (map1 && "off" in map1 && divvisible !== undefined) {
        map1 = map1.off();
        map1 = map1.remove();
    }
    map1 = L.map('map1', {
        center: [from.lat, from.lon],
        zoom: 10
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 15,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map1);
    L.circle([from.lat,from.lon], {radius: radius }).addTo(map1);
}

function runPlot(from, data, type) {

    let slice = { "bubble": undefined, "line": 15, "polygon": 10 };
    let divvisible = document.getElementById("map");
    if (map && "off" in map && divvisible !== undefined) {
        map = map.off();
        map = map.remove();
    }

    map = L.map('map', {
        center: [from.lat, from.lon],
        zoom: 3
    });
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        maxZoom: 12
    }).addTo(map);

    data.slice(0, slice[type]).map((b, i) => {
        let line = [[from.lat, from.lon], [b.lat1, b.lon1]];
        if (["line"].includes(type)) {
            L.polyline(line, { color: 'red' }).addTo(map).bindPopup(
                `${b.city1}-${Number(b.distance).toFixed(0)} KM`,
                { offset: [-100, i * 10], sticky: false, permanent: true }).openPopup();

            L.circle([b.lat1, b.lon1]
                , {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 1 / (b.pop1),
                    radius: 0.0005 * b.pop1
                }).addTo(map)
        }

        if (["bubble"].includes(type)) {
            L.circle([b.lat1, b.lon1]
                , {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 1 / (b.pop1),
                    radius: 0.0005 * b.pop1
                }).addTo(map).bindPopup(
                    `${b.city1}-${Number(b.pop1).toFixed(0)}`).openPopup();
        }
    });
}

function vegaDistanceGeo(data) {
    let spec = {
        "width": "container",
        "height": "container",
        "projection": {
            "type": "equirectangular"
        },
        "layer": [
            {
                "data": {
                    "name": "world",
                    "url": "https://vega.github.io/vega-lite/data/world-110m.json",
                    "format": { "type": "topojson", "feature": "countries" }
                },
                "mark": { "type": "geoshape", "fill": "white", "stroke": "black" }
            },
            {
                "data": {
                    "values": data
                },
                "mark": "circle",
                "encoding": {
                    "longitude": {
                        "field": "lon1",
                        "type": "quantitative"
                    },
                    "latitude": {
                        "field": "lat1",
                        "type": "quantitative"
                    },
                    "size": { "value": 5 },
                    "color": { "value": "gray" }
                }
            },
            {
                "data": {
                    "values": data
                },
                "mark": "rule",
                "encoding": {
                    "longitude": {
                        "field": "lon1",
                        "type": "quantitative"
                    },
                    "latitude": {
                        "field": "lat1",
                        "type": "quantitative"
                    },
                    "longitude2": { "field": "lon2" },
                    "latitude2": { "field": "lat2" }
                }
            }
        ]
    }

    vegaEmbed('#visdiscomp', spec);


}

export const DistanceComponent = (props) => {

    const [pop, setPop] = useState(0);
    const [selectedCities, setSelectedCities] = useState([]);
    const [data,setData] = useState([]);
    const [rad, setRad] = useState(20000);

    useLayoutEffect(()=>{
        runProximity(props.selectedCity,rad);
    },[rad, props.selectedCity]);

    useEffect(() => {

        let p = props.data.reduce((a, b) => +a + +b.population, 0);
        setPop(p);
    }, [props.data])

    const filterPop = (v) => {
        let p = props.data.filter(p => p.population > v);
        return p ? p.length : 0;
    }


    useEffect(() => {
        if (pop <= 0 && selectedCities.length <= 0)
            return;
        let allData = props.data;
        let contain = []
        let cities = allData.filter(item => selectedCities.includes(item.name));
        if (window && cities.length > 0 && pop > 0) {
            let avg = pop / cities.length;
                let activeCity = props.selectedCity;
                let tcoor = { lat: activeCity.lat, lon: activeCity.lon };
                cities.map((rec) => {
                    if (activeCity.name !== rec.name) {
                        let d = getDistanceFromLatLonInKm(tcoor.lat, tcoor.lon, rec.lat, rec.lon);
                        let c = getDistanceFromLatLonInKm(rec.lat, rec.lon, tcoor.lat, tcoor.lon);
                        contain.push({
                            'city1': rec.name, 'pop1': rec.population, 'pop2': activeCity.population,
                            'distance': d < c ? Number(d).toFixed(2) : Number(c).toFixed(2) , 'city2': activeCity.name,
                            'lat1': rec.lat, 'lon1': rec.lon,
                            'lat2': tcoor.lat, 'lon2': tcoor.lon
                        })
                    }
                })
            contain.sort((a, b) => a.distance - b.distance)
        }
        if (contain.length > 2 && pop > 0){
            setPop(0);
            setData(contain);
            //vegaDistanceGeo(contain);
            runPlot(props.selectedCity, contain, "line")
        }
    }, [pop])

    function onChangeTable(pagination, filters, sorter, extra) {
        let col = sorter.field;
        let dat = data.sort((a, b) => a[col] - b[col])
        setData(dat);
      }
    

    return (
        <>
            <Card title={
            <InputNumber addonBefore={`Circle from ${props.selectedCity.name}`} 
            addonAfter={"mtrs radius"} placeholder={"Select radius for map1"} value={rad} onChange={(v)=>setRad(v)}
            step={500} min={1000} max={50000} style={{width:500}}
            ></InputNumber>}>
            
            <div id="map1" style={{ height: '60vh', width: '95vw' }} ></div>
            </Card>
            
            <Card title={<>
            <Select style={{width:500}} title={""}
                placeholder={'Select Cities to plot, Try Top250 in country dropdown'} allowClear showSearch
                mode="tags"
                value={selectedCities}
                onChange={(v) => { setSelectedCities(v); }} 
                >
                {props.data.map((b, _) => {
                    return <Select.Option key={b.name} value={b.name} >{b.name}</Select.Option>
                })}
            </Select>
            <Button onClick={()=> setPop(1)} >Submit</Button>
            </>}>
            <div id="map" style={{ height: '60vh', width: '95vw' }} ></div>
            </Card>
            

            {/*<Card title={props.country}   >
                <div id="visdiscomp" style={{ height: '60vh', width: '95vw' }}></div>
            </Card>*/}
            <Table dataSource={data} onChange={onChangeTable} >
                  <Table.Column dataIndex={'city1'} title={'city1'} filterIcon filterSearch></Table.Column>
                  <Table.Column dataIndex={'city2'} title={'city2'} render={(v, _) => v} ></Table.Column>
                  <Table.Column dataIndex={'pop1'} title={'pop1'} render={(v, _) => v}
                    sorter={true} sortDirections={['ascend' | 'descend']} showSorterTooltip sortOrder='descend'></Table.Column>
                  <Table.Column dataIndex={'pop2'} title={'pop2'} render={(v, _) => v}   ></Table.Column>

                  <Table.Column dataIndex={'distance'} title={'distance'} render={(v, _) => v}
                    sorter={true} sortOrder='ascend' sortDirections={['ascend' | 'descend']} ></Table.Column>

                </Table> 
        </>
    )
}