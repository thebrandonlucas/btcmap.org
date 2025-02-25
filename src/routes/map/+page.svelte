<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let mapElement;
	let map;

	// allows for users to set initial view in a URL query
	const urlLat = $page.url.searchParams.getAll('lat');
	const urlLong = $page.url.searchParams.getAll('long');

	// alow for users to query by payment method with URL search params
	const onchain = $page.url.searchParams.has('onchain');
	const lightning = $page.url.searchParams.has('lightning');
	const nfc = $page.url.searchParams.has('nfc');

	onMount(async () => {
		if (browser) {
			//import packages
			const leaflet = await import('leaflet');
			const leafletLocateControl = await import('leaflet.locatecontrol');
			const leafletMarkerCluster = await import('leaflet.markercluster');
			const axios = await import('axios');

			// add map and tiles
			map = leaflet.map(mapElement).setView([0, 0], 3);

			const osm = leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				noWrap: true,
				maxZoom: 19
			});

			const osmDE = leaflet.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
				noWrap: true,
				maxZoom: 18
			});

			const osmFR = leaflet.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
				noWrap: true,
				maxZoom: 20
			});
			const topo = leaflet.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
				noWrap: true,
				maxZoom: 17
			});

			const imagery = leaflet.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{
					noWrap: true
				}
			);

			const toner = leaflet.tileLayer(
				'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.{ext}',
				{
					noWrap: true,
					maxZoom: 20,
					ext: 'png'
				}
			);

			const tonerLite = leaflet.tileLayer(
				'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}',
				{
					noWrap: true,
					maxZoom: 20,
					ext: 'png'
				}
			);

			const watercolor = leaflet.tileLayer(
				'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}',
				{
					noWrap: true,
					maxZoom: 16,
					ext: 'jpg'
				}
			);

			const terrain = leaflet.tileLayer(
				'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}',
				{
					noWrap: true,
					maxZoom: 18,
					ext: 'png'
				}
			);

			const baseMaps = {
				OpenStreetMap: osm,
				Imagery: imagery,
				Terrain: terrain,
				Topo: topo,
				Toner: toner,
				'Toner Lite': tonerLite,
				Watercolor: watercolor,
				OpenStreetMapDE: osmDE,
				OpenStreetMapFR: osmFR
			};

			const layerControl = L.control.layers(baseMaps).addTo(map);

			osm.addTo(map);

			// set URL lat/long query view if it exists and is valid
			if (urlLat.length && urlLong.length) {
				try {
					if (urlLat.length > 1 && urlLong.length > 1)
						map.fitBounds([
							[urlLat[0], urlLong[0]],
							[urlLat[1], urlLong[1]]
						]);
					else {
						map.fitBounds([[urlLat[0], urlLong[0]]]);
					}
				} catch (error) {
					console.log(error);
				}
			}

			// add click event to help devs find lat/long of desired location for iframe embeds
			map.on('click', () => {
				const coords = map.getBounds();
				console.log(`Here is your iframe embed URL: https://btcmap.org/map?lat=${coords._northEast.lat}&long=${coords._northEast.lng}&lat=${coords._southWest.lat}&long=${coords._southWest.lng}
Thanks for using BTC Map!`);
			});

			// change broken marker image path in prod
			L.Icon.Default.prototype.options.imagePath = '/icons/';

			// adds locate button to map
			L.control.locate().addTo(map);

			// add support attribution
			document.querySelector('.leaflet-control-attribution').innerHTML =
				'Support BTC Map <a href="bitcoin:bc1qng60mcufjnmz6330gze5yt4m6enzra7lywns2d" class="text-link hover:text-hover" title="On-chain"><span class="fa-brands fa-bitcoin"/></a> | <a href="lightning:btcmap@zbd.gg" class="text-link hover:text-hover" title="Lightning"><span class="fa-solid fa-bolt"/></a>';

			// adds fullscreen button to map
			const fullscreenButton = document.createElement('a');
			fullscreenButton.classList.add('leaflet-control-full-screen');
			fullscreenButton.href = '#';
			fullscreenButton.title = 'Full screen';
			fullscreenButton.role = 'button';
			fullscreenButton.ariaLabel = 'Full screen';
			fullscreenButton.ariaDisabled = 'false';
			fullscreenButton.innerHTML = '<span class="w-[16px] h-[16px] fa-solid fa-expand"></span>';
			fullscreenButton.onclick = function toggleFullscreen() {
				if (!document.fullscreenElement) {
					mapElement.requestFullscreen().catch((err) => {
						alert(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
					});
				} else {
					document.exitFullscreen();
				}
			};
			document.querySelector('.leaflet-control-zoom').append(fullscreenButton);

			// add home button to map
			const addControlDiv = document.createElement('div');
			const addHomeButton = document.createElement('a');
			addControlDiv.classList.add('leaflet-control-site-links', 'leaflet-bar', 'leaflet-control');
			addHomeButton.classList.add('leaflet-bar-part');
			addHomeButton.href = '/';
			addHomeButton.target = '_blank';
			addHomeButton.rel = 'noreferrer';
			addHomeButton.title = 'Go to home page';
			addHomeButton.role = 'button';
			addHomeButton.ariaLabel = 'Go to home page';
			addHomeButton.ariaDisabled = 'false';
			addHomeButton.innerHTML = '<span class="w-[16px] h-[16px] fa-solid fa-house"></span>';
			addControlDiv.append(addHomeButton);
			document.querySelector('.leaflet-top.leaflet-left').append(addControlDiv);

			// add location button to map
			const addLocationButton = document.createElement('a');
			addLocationButton.classList.add('leaflet-bar-part');
			addLocationButton.href = '/add-location';
			addLocationButton.target = '_blank';
			addLocationButton.rel = 'noreferrer';
			addLocationButton.title = 'Add location';
			addLocationButton.role = 'button';
			addLocationButton.ariaLabel = 'Add location';
			addLocationButton.ariaDisabled = 'false';
			addLocationButton.innerHTML =
				'<span class="w-[16px] h-[16px] fa-solid fa-location-dot"></span>';
			addControlDiv.append(addLocationButton);

			// fetch bitcoin locations from our api
			axios
				.get('https://data.btcmap.org/elements.json')
				.then(function (response) {
					// handle success
					let markers = L.markerClusterGroup();

					// check address data
					const checkAddress = (element) => {
						if (element['addr:housenumber'] && element['addr:street'] && element['addr:city']) {
							return `${
								element['addr:housenumber'] +
								' ' +
								element['addr:street'] +
								', ' +
								element['addr:city']
							}`;
						} else if (element['addr:street'] && element['addr:city']) {
							return `${element['addr:street'] + ', ' + element['addr:city']}`;
						} else if (element['addr:city']) {
							return `${element['addr:city']}`;
						} else {
							return '';
						}
					};

					// add location information to popup
					response.data.elements.forEach((element) => {
						if (
							(onchain ? element.tags['payment:onchain'] === 'yes' : true) &&
							(lightning ? element.tags['payment:lightning'] === 'yes' : true) &&
							(nfc ? element.tags['payment:lightning_contactless'] === 'yes' : true)
						) {
							const latCalc =
								element.type == 'node' ? null : (element.bounds.minlat + element.bounds.maxlat) / 2;
							const longCalc =
								element.type == 'node' ? null : (element.bounds.minlon + element.bounds.maxlon) / 2;

							let marker = L.marker(
								element.type == 'node' ? [element.lat, element.lon] : [latCalc, longCalc]
							).bindPopup(
								// marker popup component
								`${
									element.tags.name
										? `<span class='block font-bold text-lg text-primary' title='Merchant name'>${element.tags.name}</span>`
										: ''
								}

                <span class='block text-body font-bold' title='Address'>${checkAddress(
									element.tags
								)}</span>

                <div class='w-[192px] flex space-x-2 my-1'>
                  ${
										element.tags.phone
											? `<a href='tel:${element.tags.phone}' title='Phone'><span class="bg-link hover:bg-hover rounded-full p-2 w-5 h-5 text-white fa-solid fa-phone" /></a>`
											: ''
									}

                  ${
										element.tags.website
											? `<a href=${element.tags.website} target="_blank" rel="noreferrer" title='Website'><span class="bg-link hover:bg-hover rounded-full p-2 w-5 h-5 text-white fa-solid fa-globe" /></a>`
											: ''
									}

                  <a href='https://www.openstreetmap.org/edit?node=${
										element.id
									}' target="_blank" rel="noreferrer" title='Edit'><span class="bg-link hover:bg-hover rounded-full p-2 w-5 h-5 text-white fa-solid fa-pen-to-square" /></a>

                  <a href='https://btcmap.org/map?lat=${
										element.type == 'node' ? element.lat : latCalc
									}&long=${
									element.type == 'node' ? element.lon : longCalc
								}' target="_blank" rel="noreferrer" title='Share'><span class="bg-link hover:bg-hover rounded-full p-2 w-5 h-5 text-white fa-solid fa-share-nodes" /></a>
                </div>

                <div class='w-full flex space-x-2 my-1'>
                  <img src=${
										element.tags['payment:onchain'] === 'yes'
											? '/icons/btc-highlight.svg'
											: '/icons/btc.svg'
									} alt="bitcoin" class="w-6 h-6" title="${
									element.tags['payment:onchain'] === 'yes'
										? 'On-chain accepted'
										: 'On-chain unknown'
								}"/>

                  <img src=${
										element.tags['payment:lightning'] === 'yes'
											? '/icons/ln-highlight.svg'
											: '/icons/ln.svg'
									} alt="lightning" class="w-6 h-6" title="${
									element.tags['payment:lightning'] === 'yes'
										? 'Lightning accepted'
										: 'Lightning unknown'
								}"/>

                  <img src=${
										element.tags['payment:lightning_contactless'] === 'yes'
											? '/icons/nfc-highlight.svg'
											: '/icons/nfc.svg'
									} alt="nfc" class="w-6 h-6" title="${
									element.tags['payment:lightning_contactless'] === 'yes'
										? 'Lightning Contactless accepted'
										: 'Lightning Contactless unknown'
								}"/>
                </div>
								<span class='text-body my-1' title="Surveys are completed by BTC Map community members">Survey date:
								${
									element.tags['survey:date']
										? `${element.tags['survey:date']}`
										: '<span class="fa-solid fa-question"></span>'
								}
								</span>
								<a href="https://github.com/teambtcmap/btcmap-data/issues/new?assignees=&labels=good+first+issue%2Chelp+wanted%2Coutdated+info&template=REPORT-OUTDATED-INFO.yml${
									element.tags.name ? `&title=${element.tags.name}` : ''
								}&location=https://btcmap.org/map?lat=${
									element.type == 'node' ? element.lat : latCalc
								}%26long=${
									element.type == 'node' ? element.lon : longCalc
								}&edit=https://www.openstreetmap.org/edit?node=${
									element.id
								}" target="_blank" rel="noreferrer" class='text-link hover:text-hover text-xs block' title="Reporting helps improve the data for everyone">Report outdated info</a>`
							);

							markers.addLayer(marker);
						}
					});

					map.addLayer(markers);
				})
				.catch(function (error) {
					// handle error
					throw new Error(error.message);
				});
		}
	});

	onDestroy(async () => {
		if (map) {
			console.log('Unloading Leaflet map.');
			map.remove();
		}
	});
</script>

<main>
	<div bind:this={mapElement} class="h-[100vh]" />
</main>

<style>
	@import 'leaflet/dist/leaflet.css';
	@import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
	@import 'leaflet.markercluster/dist/MarkerCluster.css';
	@import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
</style>
