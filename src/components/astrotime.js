import { useEffect, useState } from 'react';
import {
    GeoVector, Observer, Equator, Horizon
    , Body, AstroTime, NextGlobalSolarEclipse, SearchLunarEclipse, MoonPhase, SearchMoonNode
} from 'astronomy-engine';

import { Col, Row, Select, Layout, Table, Menu, Tag, Card } from 'antd';
import { SearchMoonQuarter } from 'astronomy-engine';

const isSSREnabled = () => typeof window === 'undefined';

function getLahari(d) {
    console.log(d);
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
    let rahu = (259.183 - 0.05295 * d + 0.002078 * Math.pow(t, 2) + 0.000002 * Math.pow(t, 3)) % 360;
    rahu = (rahu + lahiri) % 360
    let ketu = rahu > 180 ? (rahu+180)%360 : rahu+180  ; 
    return { rahu: Number(Math.abs(rahu)).toFixed(2), ketu: Number(Math.abs(ketu)).toFixed(2) }
}
const bodies = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Earth, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];

function getValue(obs, date) {
    let record = {};
    let time = new AstroTime(date);
    let lahiri = getLahari();
    Object.values(bodies).map((b) => {
        let eq = Equator(b, time, obs, true, true);
        let hr =  Horizon(time, obs, eq.ra, eq.dec, 'normal');
        let c = Number(eq.ra * 15) - Number(lahiri);
        let d = Number(hr.ra * 15) - Number(lahiri);
        record[b.toLowerCase()] = Number(Math.abs(d % 360)).toFixed(2);

    })

    let nn = getNodes(time, lahiri)
    return { ...record, ...nn };
}

export function TimeScales(props) {

    const [data, setData] = useState([]);
    const [dates, setDates] = useState([]);
    const [years, setYears] = useState([]);
    const [times, setTimes] = useState([]);

    const [mode, setMode] = useState("EarthQuake");
    const modes = ['EarthQuake'];

    const earthQuakeTimes = {
        '1960-05-22': 9.5, '1964-03-24': 9.2, '2004-12-26': 9.1, '2011-03-11': 9.0, '1952-11-04': 9.0
        , '2010-02-27': 8.8, '1906-01-31': 8.8, '1965-04-02': 8.7, '2005-03-28': 8.6, '1950-08-15': 8.6
    }

    useEffect(() => {

        years.map((y, i) => {

                let start = new AstroTime(new Date(`2000-01-01T00:00:00.000+05:30`).setFullYear(y));
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
            console.log(obs)
            let r = getValue(obs, d);
            arr.push({ ...r, time: new AstroTime(d).toString() })
        })
        setData(arr);
    }, [dates])

    useEffect(() => {
        let a = [];
        if (mode === modes[0]) {
            Object.keys(earthQuakeTimes).map((b, _) => {
                let x = new Date(b);
                console.log(x, b);
                a.push(x)
            })
        }

        setDates(a);
    }, [mode])

    return (
        <>

            <Select style={{ width: 500 }} title={""}
                placeholder={'Select'} allowClear showSearch
                value={mode}
                onChange={(v) => { setMode(v); }}
            >
                {modes.map((b, i) => {
                    return <Select.Option key={b} value={b} >{b}</Select.Option>
                })}
            </Select>

            <Select style={{ width: 500 }} title={""}
                placeholder={'Select Years'} allowClear showSearch
                mode="tags"
                value={years}
                onChange={(v) => { setYears(v); }}
            >
                {Array(2200).fill().map((b, i) => {
                    return <Select.Option key={`${i}years`} value={2200-i} >{2200-i}</Select.Option>
                })}
            </Select>

            <Select style={{ width: 500 }} title={""}
                placeholder={'Select Dates in year'} allowClear showSearch
                mode="tags"
                value={dates}
                onChange={(v) => { setDates(v); }}
            >
                {times.map((b, _) => {
                    return <Select.Option key={b.ut} value={b.ut} >{b.toString()}</Select.Option>
                })}
            </Select>



            <Table dataSource={data}
                columns={data.length > 0 ? Object.keys(data[0]).map((a, i) => ({ 'title': a, 'dataIndex': a, 'key': a })) : []}></Table>
        </>
    )

}