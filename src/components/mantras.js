import { useEffect, useState } from "react"
import { Card, Select } from "antd";

export const MediaComponent = (props) => {
    const r2link = "https://pub-bf3b32a0cd734b809bbd676ec47a2088.r2.dev";
    const mediaList = ["gayatri.mp3", "electrons.mp4", "grounding.mp4", "huberman-circadian.mp4",
        "microsoft-canada-wireless.mp4", "radiation.mp4", "wifi-plants.mp4", "malhotra-statins.mp4","masaru-emoto.mp4"];
    const [media, setMedia] = useState(mediaList[4]);


    return (
        <>
            <Card title={
            <Select placeholder={"Select Media"} showSearch showArrow
            onSelect={(a)=> setMedia(a)} style={{width:400}}
            >
                {mediaList.map((a,_)=>{
                    return <Select.Option key={a} value={a}>{a}</Select.Option>
                })}
            </Select>}>
                <video style={{ width: "100vw", height: "75vh" }}
                    src={`${r2link}/${media}`} controls
                ></video>
            </Card>

            <p>W.I.P - Visualising music</p>


        </>
    )
}
