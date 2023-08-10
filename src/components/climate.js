import { SearchRiseSet, Observer, AstroTime, Body, SearchRelativeLongitude } from 'astronomy-engine';
import { Tag, Card, Space, Select, Divider, Row, Col } from 'antd';
import vegaEmbed from 'vega-embed';
import { useCallback, useEffect, useState } from 'react';
import spacetime from 'spacetime';
import { apiURL } from './utils';
import { model } from 'geomagnetism';


const UVBOOK = { 1: 0, 2: 0, 3: 1.2, 4: 1.2, 5: 1.2, 6: 0.75, 7: 0.75, 8: 0.5, 9: 0.5, 10: 0.3, 11: 0.3 }

function runVegaPlotYearlySunHour(body, bodies) {
  let colors = {
    "Mercury": "grey",
    "Venus": "yellow",
    "Earth": "white",
    "Mars": "red",
    "Jupiter": "orange",
    "Saturn": "black",
    "Uranus": "violet",
    "Neptune": "blue",
    "pluto": "mercury"
  }

  var vlSpec = {
    title: {
      "text": "Vitamin-D availability and requirement, Magnetic values",
      "subtitle": " daytime : availability , vitd-fair/dark : percent daytime exposure needed in sunlight"
    },
    width: "container",
    height: "container",
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: body
    },
    "transform": [{ "calculate": "datum.f*0.001", "as": "total-intensity" },
    { "calculate": "datum.h*0.001", "as": "horizontal-intensity" }],
    "repeat": { "layer": ['daytime', 'vitd-fair', 'vitd-dark', 'total-intensity', 'horizontal-intensity', 'incl', 'decl'] },
    "spec": {
      "mark": { "type": "point", "tooltip": true },
      "encoding": {
        "x": { "type": "temporal", "field": "time" },
        "y": {
          "field": { "repeat": "layer" }, "type": "quantitative",
          "axis": { "values": [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100] }
        },
        "color": { "datum": { "repeat": "layer" }, "type": "nominal" },
      }
    }
  };
  vegaEmbed('#vis', vlSpec);

  var vlSpec1 = {
    title: {
      "text": "Sun, Moon, Planets above the horizon",
      "subtitle": "Do we really know, how the planets presence above horizon impact us? "
    },
    width: 'container',
    height: 'container',
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {
      values: body
    },
    "encoding": {
      "x": { "type": "temporal", "field": "time" }
    },
    "layer": bodies.map((b, i) => (
      {
        "mark": { "opacity": 0.5, "type": "area", "color": colors[b], "tooltip": true },
        "encoding": {
          "y": {
            "field": `${b}rise`,
            "type": "temporal",
            "timeUnit": "utchoursminutes"
          },
          "y2": {
            "timeUnit": "utchoursminutes",
            "field": `${b}set`,
            "type": "temporal"
          },
        }
      }))
  };
  // Embed the visualization in the container with id `vis`
  vegaEmbed('#vis1', vlSpec1);

}

function correctValuesWithSpaceTime(v, tz) {
  v = spacetime(v?.date.toISOString()).goto(tz).iso();
  v = v.charAt(23) === "Z" ? v : v.slice(0, -6) + "Z"
  return v
}

function nuLLCheckBody(now, v) {
  return v === null ? new AstroTime(now) : v;
}

export const ClimateComponent = (props) => {

  const bodies = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Earth, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];
  const [cityData, setCityData] = useState({});
  const [mag, setMag] = useState([]);
  const [years, setYears] = useState([2023]);
  const [selectedBodies, setSelectedBodies] = useState(['Sun']);

  const getClimate = useCallback(async () => {

    const resp = await fetch(`${apiURL}/api/weather?lat=${props.selectedCity.lat}&lon=${props.selectedCity.lon}`)
    const postResp = await resp.json();
    setCityData(postResp);
  }, [props.selectedCity])

  useEffect(() => {
    getClimate()
  }, [props.selectedCity])


  useEffect(() => {
    let data = []
    if ("current" in cityData === false)
      return;
    let uvi = cityData['forecast']['forecastday'][0]["day"]["uv"];
    let tz = props.selectedCity.timezone;
    const obs = new Observer(props.selectedCity.lat, props.selectedCity.lon,
      Number(props.selectedCity.elevation) === 'NaN' || Number(props.selectedCity.elevation) === -9999
        ? 0 : Number(props.selectedCity.elevation));
    let times = []
    years.map((y, _) => {
      let d = new Date(`2000-01-01T00:00:00.000+05:30`);
      d.setFullYear(y);
      const time = new AstroTime(d);
      Array(365).fill().map((_, index) => {
        times.push(time.AddDays(index))
      })
    })

    Object.values(times).map((now, index) => {
      let maginfo = {}
      try {
        maginfo = model(now.date).point([props.selectedCity.lat, props.selectedCity.lon]);
      }
      catch (err) {
      }
      let bodiesData = {}
      selectedBodies.map((body) => {
        let bodyrise = SearchRiseSet(body, obs, 1, now, 1);
        let bodyset = SearchRiseSet(body, obs, -1, bodyrise ? bodyrise : now, 1);
        bodyrise = nuLLCheckBody(now, bodyrise);
        bodyset = nuLLCheckBody(now, bodyset);
        let bh = Number(Math.abs(bodyset?.date.getTime() - bodyrise?.date.getTime()) / 36e5).toFixed(2);
        bodyrise = correctValuesWithSpaceTime(bodyrise, tz);
        bodyset = correctValuesWithSpaceTime(bodyset, tz);
        bodiesData[body + "rise"] = bodyrise;
        bodiesData[body + "set"] = bodyset;
        bodiesData[body + "hour"] = bh;
        bodiesData['time'] = now;
        if (body === "Sun") {
          bodiesData["vitd-fair"] = UVBOOK[uvi] * 100 / bh;
          bodiesData["vitd-dark"] = UVBOOK[uvi] * 100 * 2 / bh;
        }
      });
      data.push({ ...bodiesData, ...maginfo });
    });
    runVegaPlotYearlySunHour(data, selectedBodies);
  }, [cityData, selectedBodies, years])

  return (
    <>
      <Card >

        {'forecast' in cityData && 'forecastday' in cityData['forecast'] &&
          'day' in cityData['forecast']['forecastday'][0] ?
          Object.entries(cityData['forecast']['forecastday'][0]['day']).map(([k, v], _) => {

            return ["air_quality", "condition"].includes(k) ? null : <Tag  >{k}:{JSON.stringify(v)}</Tag>
          }) : "Select a city"}
        {'forecast' in cityData && 'forecastday' in cityData['forecast'] &&
          'day' in cityData['forecast']['forecastday'][0] && 'air_quality' in cityData['forecast']['forecastday'][0]['day']
          ?
          Object.entries(cityData['forecast']['forecastday'][0]['day']['air_quality']).map(([k, v], _) => {

            return <Tag  >{k}:{JSON.stringify(v)}</Tag>
          }) : ""}
        <br></br>
        <br></br>
      </Card>
      <Card title={
        <>
          <Select style={{ width: 500 }} title={""}
            placeholder={'Select Bodies to plot'} allowClear showSearch
            mode="tags"
            value={selectedBodies}
            onChange={(v) => { setSelectedBodies(v); }} >
            {
              bodies.map((b, _) => {
                return <Select.Option key={b} value={b} disabled={b == "Earth"}>{b}</Select.Option>
              })}
          </Select>
          <Select style={{ width: 500 }} title={""}
            placeholder={'Select Years'} allowClear showSearch
            mode="tags"
            value={years}
            onChange={(v) => { setYears(v); }}
          >
            {Array(2200).fill().map((b, i) => {
              return <Select.Option key={`${i}years`} value={2200 - i} >{2200 - i}</Select.Option>
            })}
          </Select></>

      }    >
        <div id="vis1" style={{ width: "95vw", height: "65vh" }}></div>
      </Card>
      <Card>
        <div id="vis" style={{ width: "95vw", height: "65vh" }}></div>
      </Card>
      <Card title={"Heliocentric Relative longitude between Earth and Planets After Days"}>
        {
          [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map((trl, _) => {
            return <Row>
              <Col><Tag> {trl} </Tag></Col>
              {bodies.map((b, _) => {

                return ['Sun', 'Moon', 'Earth'].includes(b) === false && <Col> <Tag> {b} : {
                  spacetime(new Date().toISOString()).diff(SearchRelativeLongitude(b, trl, new AstroTime(new Date()))?.date?.toISOString(),'days')}
                </Tag></Col>

              })}
            </Row>
          })
        }

      </Card>
      <br></br>
    </>
  )
}