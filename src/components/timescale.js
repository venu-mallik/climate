import { useEffect, useState, useRef } from 'react';
import {  Input , Tag, Card} from 'antd';
import spacetime from 'spacetime';

const isSSREnabled = () => typeof window === 'undefined';

export const TimeScales = () => {
    const [selectedDate,setSelectedDate] = useState(new Date("1993-11-03").toISOString());
    const [nw, setNow] = useState(new Date().toISOString())
    const [data,setData] = useState([]);

    return(
        <>
        
        <Input  type='datetime' onChange={(e)=> setSelectedDate(e.target.value)} value={selectedDate}></Input>
        <Input type='datetime' onChange={(e)=> setNow(e.target.value)} value={nw}></Input>
        <Card>
        {
            ['milliseconds','seconds','minutes','hours','days','weeks','months','years'].map((b)=>{
             return <><Tag> {b} - { spacetime(selectedDate).diff(spacetime(nw))[b] }</Tag><br></br></>
            })
        }

        <div id="vistime" style={{width:"95vw", height: "auto"}}>

        </div>

        </Card>
        </>
    )

}