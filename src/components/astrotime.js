import { useEffect, useState, useRef } from 'react';
import {
    GeoVector, Observer, Equator, Horizon
    , Body, AstroTime, NextGlobalSolarEclipse, SearchLunarEclipse, MoonPhase, SearchMoonNode
} from 'astronomy-engine';

import { Select, Table, Divider, Switch } from 'antd';
import { sachin_odis } from './_datasets';
import {
    GoodDaysBy_Day_thithi,
    VeryGoodDaysBy_Day_Stars,
    BadDaysByDay_thithi, BadDaysBy_Day_Stars, DLNL_Day_Star
} from './_panchangerules';
import { CSVLink } from "react-csv";
//import * as perspective from "https://cdn.jsdelivr.net/npm/@finos/perspective/dist/cdn/perspective.js";
import perspective from '@finos/perspective';

const isSSREnabled = () => typeof window === 'undefined';

function numberRange (start, end) {
    return new Array(end - start).fill().map((d, i) => i + start);
}

function getLahari(d) {

    if (d instanceof Date) {

        let a = (16.90709 * d.year / 1000) - 0.757371 * (d.year / 1000) * (d.year / 1000) - 6.92416100010001000;
        let b = ((d.month - 1 + d.day) / 30) * 1.1574074 / 1000;
        //console.log(a, b, d, JSON.stringify(d));
        return Math.abs(a + b);
    }
    return Number(23.5);

}

function getNodes(tim, lahiri) {
    let t = 1.018;
    const JD = new AstroTime(new Date(1900, 0, 1, 0, 0, 0));
    let d = (JD.date.getTime() - tim.date.getTime()) / (1000 * 60 * 60 * 24);
    let rahu = (259.183 - 0.05295 * (d + 1) + 0.002078 * Math.pow(t, 2) + 0.000002 * Math.pow(t, 3)) % 360;
    rahu = (rahu - lahiri) % 360
    let ketu = rahu > 180 ? (rahu + 180) % 360 : rahu + 180;
    return { Rahu: Number(Math.abs(rahu)).toFixed(2), Ketu: Number(Math.abs(ketu)).toFixed(2) }
}
const allBodies = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Earth, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];
const BodyDistances = {
    [Body.Sun]: 0.00, [Body.Mercury]: 0.462,
    [Body.Venus]: 0.728, [Body.Earth]: 1.014, [Body.Moon]: 1.0159,
    [Body.Mars]: 1.644, [Body.Jupiter]: 4.96, [Body.Saturn]: 9.80,
    [Body.Uranus]: 19.6, [Body.Neptune]: 29.886, [Body.Pluto]: 34.76
}

const BodyAdjustedDistances = {
    [Body.Sun]: 0.00, [Body.Mercury]: 2.5,
    [Body.Venus]: 5, [Body.Earth]: 7.5, [Body.Moon]: 7.6,
    [Body.Mars]: 10, [Body.Jupiter]: 12.5, [Body.Saturn]: 15,
    [Body.Uranus]: 19.6, [Body.Neptune]: 29.886, [Body.Pluto]: 34.76
}


function computeStrength(record) {
    let day = parseInt(record['weekday']);
    let gdds = VeryGoodDaysBy_Day_Stars[day].includes(record['star']) ? 1 : 0;
    let gddt = GoodDaysBy_Day_thithi[day].includes(record['thithi']) ? 1 : 0;
    let dlnl = DLNL_Day_Star[day].includes(record['star']) ? 1 : 0;


    let bddt = BadDaysByDay_thithi[day].includes(record['thithi']) ? 1 : 0;
    let bdds = BadDaysBy_Day_Stars[day].includes(record['star']) ? 1 : 0;

    return { dlnl: dlnl, gdds: gdds, gddt: gddt, bdds: bdds, bddt: bddt };

}

function getValue(obs, date, bodies) {
    let record = {};
    let time = new AstroTime(date);
    let lahiri = getLahari();
    Object.values(bodies).map((b) => {
        let eq = Equator(b, time, obs, true, true);
        let hr = Horizon(time, obs, eq.ra, eq.dec, 'normal');
        let d = Number(hr.ra * 15) +360  - Number(lahiri);
        record[b] = Number(Math.abs(d % 360)).toFixed(2);

    })
    let th = record[Body.Moon] - record[Body.Sun];
    record['thithi'] = th < 0 ? parseInt((th + 360) / 12 + 1) : parseInt(1 + (th / 12));
    record['star'] = parseInt(parseInt(record[Body.Moon]*60)/800 ) + 1;
    record['weekday'] = time.date.getDay();

    let st = computeStrength(record);
    let nn = getNodes(time, lahiri);
    return { ...record, ...nn };
}

function doTransformer(t, flag) {
    switch (flag) {
        case 'd1':
            return 1 + parseInt(Number(t) / 30);
        case 'd9':
            return 1 + parseInt(((Number(t) * 60) / 2400));
        case 'star':
            return 1 + parseInt((Number(t) * 60) / 800);
        case 'exal':
            return t
        case "debil":
            return t
        case "vargottama":
            return parseInt((Number(t) * 60) / 2400) == parseInt(Number(t) / 30) ? 1 : 0;
        default:
            return t
    }
}

function drawSky(ctx, row) {

    ctx.reset()
    ctx.beginPath();
    ctx.arc(100, 100, 90, 0, 2 * Math.PI);
    ctx.stroke();


    Object.entries(row).map(([k, v], i) => {
        if (bodies.includes(k)) {
            ctx.beginPath();
            ctx.arc(100, 100, BodyAdjustedDistances[k] * 2.5, Number(v), Number(v) + 0.25);
            ctx.stroke();
        }
    })
}


const SkyCanvas = (props) => {
    const canvas = useRef();
    useEffect(() => {
        const context = canvas.current.getContext('2d');
        drawSky(context, props.row);
    });
    return (

        <canvas ref={canvas} title={props?.row?.time} height={200} width={200} />
    );
}
var pworker = perspective.worker();
export function AstroScales(props) {

    const [data, setData] = useState([]);
    const [dates, setDates] = useState([]);
    const [years, setYears] = useState([]);
    const [times, setTimes] = useState([]);
    const [saveData, setSaveData] = useState([]);
    const [bodies, setBodies] = useState([Body.Pluto, Body.Saturn, Body.Jupiter, Body.Uranus]);
    const [vis, setVis] = useState(false);
    const [mode, setMode] = useState("Covid");
    const modes = ['EarthQuake', "Browse", "Sachin_ODIs", "Covid"];

    const [transform, setTransform] = useState("degree");
    const transforms = ["degree", "d1", "d9", "star", "exal", "debil", "vargottama"]

    const earthQuakeTimes = {
        '1960-05-22': 9.5, '1964-03-24': 9.2, '2004-12-26': 9.1, '2011-03-11': 9.0, '1952-11-04': 9.0
        , '2010-02-27': 8.8, '1906-01-31': 8.8, '1965-04-02': 8.7, '2005-03-28': 8.6, '1950-08-15': 8.6
    }

    useEffect(() => {

        years.map((y, i) => {
            let d = new Date(`2000-01-01T00:00:00.000+05:30`);
            d.setFullYear(y);
            let start = new AstroTime(new Date(d));
            let arr = []
            Array(366).fill().map((_, index) => {
                arr.push(start.AddDays(index))
            })
            setTimes([...times, ...arr]);
        })
    }, [years])

    useEffect(() => {
        let obs = new Observer(Number(props?.selectedCity?.lat), Number(props?.selectedCity?.lon), Number(props?.selectedCity?.elevation));
        let arr = []
        dates.map((d, _) => {
            //console.log(obs)
            let r = getValue(obs, d.date, bodies);
            let k = { ...r, time: new AstroTime(d.date).toString() };
            if (mode === modes[2]) {
                k['score'] = d.score;
            }
            arr.push(k)
        })
        setData(arr);
        setSaveData(arr);
    }, [dates, bodies, props.selectedCity.lat, props.selectedCity.lon])

    useEffect(() => {
        let a = [];
        if (mode === modes[0]) {
            Object.keys(earthQuakeTimes).map((b, _) => {
                let x = new Date(b);
                a.push({ date: x })
            })
        }
        else if (mode === modes[1]) {
            setYears([]);
            setData([]);
        }
        else if (mode === modes[2]) {
            sachin_odis.map((rec, _) => {
                let x = new Date(rec['Start Date'])
                a.push({ date: x, score: rec.Runs });
            })
        }
        else if(mode === modes[3]) {
            setData([]);
            numberRange(1975,2025).map((y, i) => {
                let d = new Date(`2000-01-01T00:00:00.000+05:30`);
                d.setFullYear(y);
                let start = new AstroTime(new Date(d));
                Array(52).fill().map((_, index) => {
                    a.push(start.AddDays(7))
                })
                setTimes([...times, ...a]);
            })
        }
        setDates(a);
    }, [mode])

    useEffect(()=> {
        const fnpw = async () => {
        const viewer = document.querySelector("perspective-viewer");

        const tabledata = await pworker.table(data, { index: "time" });
        console.log(tabledata, tabledata.size() , data, viewer, viewer.id);
        await viewer.load(tabledata);
        //viewer.restore({ theme: "Pro Dark" });
        await viewer.restore({ plugin: "Y Area", columns: ["Pluto","Saturn","Jupiter"],
        title: "what is the common in 1983 and 2020? HIV/covid and outer planet conjunction namely pluto, saturn and jupiter" });
        
      }
        if(vis){
            fnpw();
        }
    
    },[vis])

    return (
        <>

            <Switch size='default'  checked={vis} onChange={() => setVis(!vis)} ></Switch>
            <Select style={{ width: 200 }} title={""}
                placeholder={'Select'} allowClear showSearch
                value={mode}
                onChange={(v) => { setMode(v); }}
            >
                {modes.map((b, i) => {
                    return <Select.Option key={b} value={b} >{b}</Select.Option>
                })}
            </Select>

            <Select style={{ width: 200 }} title={""}
                placeholder={'Select'} allowClear showSearch
                value={transform}
                onChange={(v) => { setTransform(v); }}
            >
                {transforms.map((b, i) => {
                    return <Select.Option key={b} value={b} >{b}</Select.Option>
                })}
            </Select>

            <Select style={{ width: 600 }} title={""}
                placeholder={'Select'} allowClear showSearch mode="tags"
                value={bodies}
                onChange={(v) => { setBodies(v); }}
            >
                {allBodies.map((b, i) => {
                    return <Select.Option key={b} value={b} >{b}</Select.Option>
                })}
            </Select>

            {mode === "Browse" &&
                <Select style={{ width: 500 }} title={""}
                    placeholder={'Select Years'} allowClear showSearch
                    mode="tags"
                    value={years}
                    onChange={(v) => { setYears(v); }}
                >
                    {Array(2200).fill().map((b, i) => {
                        return <Select.Option key={`${i}years`} value={2200 - i} >{2200 - i}</Select.Option>
                    })}
                </Select>}

            {years.length > 0 && mode === "Browse" &&
                <Select style={{ width: 500 }} title={""}
                    placeholder={'Select Dates in year'} allowClear showSearch
                    mode="tags"
                    value={dates.map(a => a.date)}
                    onChange={(v) => { setDates(v.map(a => ({ date: a }))); }}
                >
                    {times.map((b, _) => {
                        return <Select.Option key={b.ut} value={b.ut} >{b.toString()}</Select.Option>
                    })}
                </Select>}


            <Divider></Divider>
            {/*
                
                data.map((rec,id)=>{
                    return <SkyCanvas  row={rec}  key={"canvas"+id}></SkyCanvas>
                })
            */}
            <CSVLink
                filename={"TableContent.csv"}
                data={data}
                className="btn btn-primary"
            >
                Download csv
            </CSVLink>
            
            {vis ? 
            <>
            <div style={{width: 800, height:800}}  > 

            <perspective-viewer style={{width: 1200, height:800}} id="perspectiveviewer"  ></perspective-viewer>
            </div>
            
            </>
            
            :
            <Table dataSource={data} style={{ width: '100vw' }} scroll={{ x: 1500 }}
                columns={data.length > 0 ? Object.keys(data[0]).map((a, i) =>
                ({
                    'title': a, 'dataIndex': a, 'key': a, 'fixed': a === "time" ? "right" : false,
                    "render": function (t, r, i) {
                        if (['time', 'thithi'].includes(a)) return t;
                        return doTransformer(t, transform);

                    }
                }))
                    : []}></Table>}
        </>
    )

}