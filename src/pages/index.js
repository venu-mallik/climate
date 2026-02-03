import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { ClimateComponent } from '@/components/climate';
import { TimeScales } from '@/components/timescale';
import PlanetDegrees from '@/components/PlanetDegrees';
import HousesSouthIndian from '@/components/HousesSouthIndian';

const isSSREnabled = () => typeof window === 'undefined';

export default function Home() {

  const [activeTab,setActiveTab] = useState(4);
  const [selectedCity, setselectedCity] = useState({name: "Vijayawada", lat: 16, lon: 80, elevation : 30, timezone: "Asia/Kolkata" });

  return ( 
            !isSSREnabled() ?
            <>   
              <Layout>
            <div className="demo-logo" />
            <Menu theme="dark" mode="horizontal" defaultSelectedKeys={[activeTab]} 
            items={[
              {key: 1, label: 'Climate'},
              {key: 2, label: 'Time Scales'},
              {key: 3, label: 'Planet Degrees'},
              {key: 4, label: 'Sky'}
            ]}
              onClick={(e) => { setActiveTab(e.key) }} />
          <Layout.Content>

                <br></br>
                {activeTab == 1 && <ClimateComponent selectedCity={selectedCity} />}
                { activeTab == 2 && 
                  <TimeScales selectedCity={selectedCity}/> }
                { activeTab == 3 &&
                  <PlanetDegrees /> }
                { activeTab == 4 &&
                  <HousesSouthIndian /> }
                </Layout.Content>
                </Layout>
              </>: null
  )
}
