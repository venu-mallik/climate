import { useEffect, useState } from "react";
import { Statistic, Typography, Space, Card, Table, Select, Button } from "antd";
import vegaEmbed from 'vega-embed';
import { model } from 'geomagnetism';

var map;

function runPlot(from, data, type) {

    let slice = { "bubble": 100, "line": 15, "polygon": 10 };
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
            L.polyline(line, { color: 'red' }).addTo(map).bindTooltip(
                `${b.city1}-${Number(b.distance).toFixed(0)} KM`,
                { offset: [-100, i * 10], sticky: false, permanent: true }).openTooltip();

            L.circle([b.lat1, b.lon1]
                , {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 1 / (b.pop1),
                    radius: 0.0005 * b.pop1
                }).addTo(map)
        }

        if (["bubble"].includes(type)) {
            L.circle([b.lat, b.lon]
                , {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 1 / (b.population),
                    radius: b.f ? b.f * 0.0001 : 0.1
                }).addTo(map).bindPopup(
                    `${b.name}-${Number(b.population).toFixed(0)}-${Number(b.f).toFixed(0)} nT`).openPopup();
        }
    });
}

function vegaGeo(data) {
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
                "data": { "values": data },
                "mark": { "type": "circle", "color": "red" },
                "encoding": {
                    "longitude": { "field": "lon", "type": "quantitative" },
                    "latitude": { "field": "lat", "type": "quantitative" },
                    "color": { "field": "f", "bin": { "binned": true, "maxbins": 10 } },
                    "tooltip": [{ "field": "name" }, { "field": "population", "type": "quantitative" }, { "field": "f", "type": "quantitative" }]
                },
                "config": {
                    "view": {
                        "stroke": "transparent"
                    }
                }
            }

        ]

    }
    let specEle = {
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
                "data": { "values": data.filter(a => a.elevation >= 0) },
                "mark": { "type": "circle", "color": "red" },
                "encoding": {
                    "longitude": { "field": "lon", "type": "quantitative" },
                    "latitude": { "field": "lat", "type": "quantitative" },
                    "size": { "value": 5 },
                    "color": { "field": "elevation", "type": "ordinal" },
                    "tooltip": [{ "field": "name" }, { "field": "elevation", "type": "quantitative" }]
                },
                "config": {
                    "view": {
                        "stroke": "transparent"
                    }
                }
            }

        ]

    }


    vegaEmbed('#vishome', spec);
    vegaEmbed('#visele', specEle)


}

export const MagneticComponent = (props) => {

    const [pop, setPop] = useState(0);
    const [data, setData] = useState([])
    const [selectedCities, setSelectedCities] = useState([]);

    useEffect(() => {

        let cities = props.data;
        if (window && cities.length > 0) {
            let p = []
            cities.map((r, i) => {
                let m = model(new Date()).point([r.lat, r.lon]);
                p.push({ ...r, ...m })
            })
            setData(p);
            cities = p;
            vegaGeo(cities)
            runPlot(cities[0], cities, 'bubble');
        }

    }, [props.data])

    useEffect(() => {

        let p = props.data.reduce((a, b) => +a + +b.population, 0);
        setPop(p);
    }, [props.data])

    const filterPop = (v) => {
        let p = props.data.filter(p => p.population > v);
        return p ? p.length : 0;
    }


    return (
        <>

            <Card title={props.country}   >
                <Space direction="horizontal" >
                    <Statistic value={pop} title="Population"></Statistic>
                    <Statistic value={"length" in props.data ? props.data.length : 0} title="Areas" ></Statistic>
                    <Statistic value={filterPop(1000000)} title="1000k+"></Statistic>
                    <Statistic value={filterPop(500000)} title="500k+"></Statistic>
                    <Statistic value={filterPop(100000)} title="100k+"></Statistic>
                </Space>
                <div id="map" style={{ height: '60vh', width: '95vw' }} ></div>
            </Card>
            <Card title={"Magnetic total intensity at each city using WMM"}>
                <div id="vishome" style={{ height: '60vh', width: '95vw' }}></div>
            </Card>
            <Card title={"elevation Plot of the areas"}>
                <div id="visele" style={{ height: '60vh', width: '95vw' }}></div>
            </Card>
            <Card title={<>
                <Select style={{ width: 500 }} title={""}
                    placeholder={'Select Cities to filter'} allowClear showSearch
                    mode="tags"
                    value={selectedCities}
                    onChange={(v) => { setSelectedCities(v); }}
                >
                    {props.data.map((b, _) => {
                        return <Select.Option key={b.name} value={b.name} >{b.name}</Select.Option>
                    })}
                </Select>
                <Button onClick={() => setPop(1)} >Submit</Button>
            </>}>

                <Table dataSource={data.filter(a => selectedCities.length === 0 || selectedCities.includes(a.name))}
                    style={{width: '100vw'}}
                    scroll={{x : 1800}}
                    columns={data.length > 0 ? Object.keys(data[0]).map((a, i) =>
                        ({ 'title': a, 'dataIndex': a, 'key': a , 'fixed' : i < 2 ? 'left' : false }))
                        : []}></Table>
            </Card>

        </>
    )
}