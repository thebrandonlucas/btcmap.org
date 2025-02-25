import axios from 'axios';
import { AIRTABLE_API_KEY } from '$env/static/private';

export async function POST({ request }) {
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let { name, address, lat, long, osm, url, methods, twitterMerchant, twitterSubmitter, notes } =
		await request.json();

	let airtable = await axios
		.post(
			'https://api.airtable.com/v0/app4wIiES4dsRLIrH/Locations',
			{
				fields: {
					Name: name,
					Address: address,
					lat: lat,
					long: long,
					osm: osm,
					URL: url,
					fldsVjrsPyMKV7ro1: methods,
					fldfXqVj05zgONpHv: twitterMerchant,
					fldDN1WtilxEgixeT: twitterSubmitter,
					Notes: notes,
					Status: 'Todo',
					fldgbuR3ugA8K46uJ: new Date(Date.now()).toISOString()
				}
			},
			{ headers }
		)
		.then(function (response) {
			return response.data;
		})
		.catch(function (error) {
			console.log(error);
			throw new Error(error);
		});

	return new Response(JSON.stringify(airtable));
}
