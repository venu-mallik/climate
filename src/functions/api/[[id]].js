import {cities} from '../cities';




export function onRequestGet(context) {
    const id = context.params.id
    let li = new Map();
    cities.map(c => li.add(c.country))
    let init = "India"

    return Response.json( { "countries" : li , "data" : cities.filter((c) => c.country === init ) })

}