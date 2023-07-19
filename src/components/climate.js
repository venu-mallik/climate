import {  SearchRiseSet, Observer, AstroTime  }  from 'astronomy-engine';
import { Tag, Card, Space } from 'antd';
import vegaEmbed from 'vega-embed';
import { useCallback, useEffect, useState } from 'react';
import spacetime from 'spacetime';

const UVBOOK = { 1 : 0, 2 : 0 , 3 : 1.2, 4 : 1.2, 5 : 1.2, 6: 0.75, 7 : 0.75, 8 : 0.5, 9: 0.5 , 10 : 0.3 , 11: 0.3}

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
  
export const ClimateComponent = (props) => {

    const apiURL = "https://citygrid.vrworkers.workers.dev";
    const [cityData,setCityData] = useState({});

    const getClimate = useCallback(async ()=>{
        
        const resp = await fetch(`${apiURL}/api/weather?lat=${props.selectedCity.lat}&lon=${props.selectedCity.lon}`)
        const postResp = await resp.json();
        console.log(postResp);
        setCityData(postResp);
    },[props.selectedCity])

    useEffect(()=>{
        getClimate()
    },[props.selectedCity])

    useEffect(()=>{
        let data = []
        if("current" in cityData === false)
          return;
        let uvi = cityData['forecast']['forecastday'][0]["day"]["uv"]
        const obs = new Observer( props.selectedCity.lat, props.selectedCity.lon, 
          Number(props.selectedCity.elevation) === 'NaN' || Number(props.selectedCity.elevation) === -9999
        ? 0 : Number(props.selectedCity.elevation) );
        let times = []
        const time = new AstroTime(new Date(`${new Date().getFullYear()}-01-01`));
        Array(365).fill().map((_, index) => {
          times.push(time.AddDays(index))
        })
    
        Object.values(times).map((now, index) => {
        let sunrise = SearchRiseSet("Sun", obs, 1 , now, 1  );
        let sunset = SearchRiseSet("Sun", obs, -1 , sunrise ? sunrise : now , 1  );
        if(sunrise === null || sunset === null){
          let dayend = spacetime(now.date).endOf('day');
          console.log(index, times[index], dayend);
          sunrise = sunrise === null ?  new AstroTime(now) : sunrise;
          sunset = sunset === null ? new AstroTime( now ) : sunset;
        }
        let moonrise = SearchRiseSet("Moon", obs, 1 , now, 1  )
        let moonset = SearchRiseSet("Moon", obs, -1 , moonrise ? moonrise : now, 1  )  
        let sh = Number(Math.abs(sunset?.date.getTime() - sunrise?.date.getTime() )/36e5).toFixed(2);
        let mh = Number(Math.abs(moonset?.date.getTime() - moonrise?.date.getTime())/36e5).toFixed(2);
        sunrise = spacetime(sunrise?.date.toISOString()).goto(props.selectedCity.timezone).iso();
        sunset = spacetime(sunset?.date.toISOString()).goto(props.selectedCity.timezone).iso();
        sunrise = sunrise.charAt(23) === "Z" ? sunrise : sunrise.slice(0,-6) + "Z"
        sunset = sunset.charAt(23) === "Z" ? sunset : sunset.slice(0,-6) + "Z"
        moonrise = spacetime(moonrise?.date.toISOString()).goto(props.selectedCity.timezone).iso();
        moonset = spacetime(moonset?.date.toISOString()).goto(props.selectedCity.timezone).iso();
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
          runVegaPlotYearlySunHour(data);
        },[cityData])
    
    return (
        <>
        <Card >

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
        <br></br>
        <div id="vis"  style={{ width: "95vw", height: "65vh"}}></div>
        </Card>
        <Card >
        <div id="vis1"  style={{width: "95vw", height: "65vh"}}></div>
        </Card>
        <br></br>
        </>
    )
}