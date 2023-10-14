import { invert } from "lodash";

const StarsBy = {Abhijit:"28",Anuradha:"17",Ardra:"6",Ashlesha:"9",Ashwini:"1",Bharani:"2",Chitra:"14",Dhanishta:"23",Hasta:"13",Jyeshtha:"18",Krittika:"3",Magha:"10",Moola:"19",Mrigashirsha:"5",Poorva_Phalguni:"11",Punarvasu:"7",Purva_Ashadha:"20",Purva_Bhadrapada:"25",Pushya:"8",Revati:"27",Rohini:"4",Shatabhisha:"24",Shravana:"22",Swati:"15",Uttara_Ashadha:"21",Uttara_Bhadrapada:"26",Uttara_Phalguni:"12",Vishakha:"16"
}

export const Stars = {1: 'Ashwini', 2: 'Bharani', 3: 'Krittika', 4: 'Rohini', 5: 'Mrigashirsha', 6: 'Ardra', 7: 'Punarvasu', 8: 'Pushya', 9: 'Ashlesha',10: 'Magha', 11: 'Poorva_Phalguni', 12: 'Uttara_Phalguni', 13: 'Hasta', 14: 'Chitra', 15: 'Swati', 16: 'Vishakha', 17: 'Anuradha', 18: 'Jyeshtha',19: 'Moola', 20: 'Purva_Ashadha', 21: 'Uttara_Ashadha', 22: 'Shravana', 23: 'Dhanishta', 24: 'Shatabhisha', 25: 'Purva_Bhadrapada', 26: 'Uttara_Bhadrapada', 27: 'Revati',28: 'Abhijit'
}

export const Thithis = {1: "PRATIPAD", 2: "DWITIYA", 3: "TRITIYA", 4: "CHATURTHI", 5: "PANCHAMI", 6: "SHASHTI", 7: "SAPTAMI", 8: "ASHTAMI", 9: "NAVAMI", 10: "DASHAMI", 11: "EKADASHI", 12: "DWADASHI", 13: "TRAYODASHI", 14: "CHATURDASHI", 15: "PURNIMA",16: "PRATIPAD", 17: "DWITIYA", 18: "TRITIYA", 19: "CHATURTHI", 20: "PANCHAMI", 21: "SHASHTI", 22: "SAPTAMI", 23: "ASHTAMI", 24: "NAVAMI", 25: "DASHAMI", 26: "EKADASHI", 27: "DWADASHI", 28: "TRAYODASHI", 29: "CHATURDASHI", 30: "AMAVASYA"
};

export const TravelAdvisoryonThithis = {"EAST": [1, 16, 9, 24], "North": [2, 10, 17, 25], "WEST": [6, 14, 21, 29], "South": [5, 13, 20, 28],"Northwest": [7, 15, 22], "Southwest": [4, 12, 19, 27], "Southeast": [3, 11, 18, 26], "NorthEast": [8, 23, 30]
}

export const BadStarsForTravel= [StarsBy.Uttara_Phalguni,StarsBy.Uttara_Ashadha,StarsBy.Uttara_Ashadha,StarsBy.Magha,StarsBy.Ardra,StarsBy.Bharani,StarsBy.Ashlesha,StarsBy.Krittika];

export const GoodStarsForTravel = [StarsBy.Ashwini, StarsBy.Anuradha, StarsBy.Revati, StarsBy.Mrigashirsha, StarsBy.Moola, StarsBy.Punarvasu,
StarsBy.Pushya, StarsBy.Hasta, StarsBy.Hasta, StarsBy.Jyeshtha];

export const GoodStarsForFoundationMining = [StarsBy.Krittika, StarsBy.Bharani, StarsBy.Ashlesha
, StarsBy.Magha, StarsBy.Moola, StarsBy.Vishakha, StarsBy.Poorva_Phalguni, StarsBy.Purva_Ashadha,
StarsBy.Poorva_Phalguni];

export const GoodStarsForSeeding_Rearing_Machinery_StartingConstruction = [StarsBy.Revati, StarsBy.Ashwini, StarsBy.Chitra, StarsBy.Swati,
StarsBy.Hasta, StarsBy.Punarvasu, StarsBy.Anuradha, StarsBy.Mrigashirsha, StarsBy.Jyeshtha];

export const GoodStarsForOath_NewPromotions = [StarsBy.Rohini, StarsBy.Ardra, StarsBy.Pushya,
StarsBy.Dhanishta, StarsBy.Uttara_Phalguni, StarsBy.Uttara_Ashadha, StarsBy.Uttara_Bhadrapada, StarsBy.Shatabhisha, StarsBy.Shravana];

export const BadThithiForSubhaKaryalu = [4,19,6,21,8,23,,9,24,12,27,14,28,15,30];

// page 146 para 1,5
export const BadDaysBy_Day_Stars = {
0: [StarsBy.Vishakha],
1: [StarsBy.Purva_Ashadha,StarsBy.Uttara_Ashadha,StarsBy.Shravana,StarsBy.Chitra],
2: [StarsBy.Dhanishta, StarsBy.Shatabhisha,StarsBy.Purva_Bhadrapada,StarsBy.Uttara_Ashadha],
3: [StarsBy.Revati, StarsBy.Ashwini, StarsBy.Bharani, StarsBy.Dhanishta],
4: [StarsBy.Rohini,StarsBy.Mrigashirsha, StarsBy.Ardra, StarsBy.Shatabhisha],
5: [StarsBy.Pushya, StarsBy.Ashlesha, StarsBy.Rohini, StarsBy.Rohini],
6: [StarsBy.Uttara_Phalguni,StarsBy.Hasta,StarsBy.Chitra, StarsBy.Revati],
}
// page 146 para 2, 4
export const VeryGoodDaysBy_Day_Stars = {
0:[StarsBy.Moola, StarsBy.Hasta],
1:[StarsBy.Shravana, StarsBy.Mrigashirsha],
2:[StarsBy.Uttara_Bhadrapada,StarsBy.Ashwini],
3:[StarsBy.Krittika, StarsBy.Anuradha],
4:[StarsBy.Punarvasu, StarsBy.Pushya],
5:[StarsBy.Poorva_Phalguni, StarsBy.Revati],
6:[StarsBy.Swati, StarsBy.Rohini]
}

// page 145 
export const GoodDaysBy_Day_thithi = {0 : [8,23,15,30], 1: [9,24],2: [3,6,8,18,21,23,13,28],3: [9,24,12,27],4: [5,20,10,25,11,26],5: [6,11,26,21],6: [4,19,13,14,28,19]}
export const DagdhaDaysByDay_thithi = { 0 : [12,27] , 1 : [11,26], 2: [10,25], 3: [1,8,9,14,16,23,24,28], 4:[8,23], 5: [7,22], 6:[6,21]};
export const DaghaSankranthi_Sun_thithi = {  }

//TODO: Page 146 , yoga para with 120 number