import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import {Tile as Tile, Vector as VectorLayer} from 'ol/layer';
import {bbox as bboxStrategy} from 'ol/loadingstrategy'
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {Style, Circle, Fill, Stroke} from 'ol/style';
import {Attribution, defaults as defaultControls} from 'ol/control'
import XYZ from "ol/source/XYZ";
import HeatmapLayer from 'ol/layer/Heatmap';

import ScaleLine from 'ol/control/ScaleLine';
import {TileWMS} from "ol/source";
import * as number from "ol/math";

// Create the scale line control
const scaleLineControl = new ScaleLine({
    target: document.getElementById('scale-line'), // Replace 'scale-line' with the ID of the HTML element where you want to display the zoom level
    units: 'metric' // Adjust the units as desired (e.g., 'metric', 'imperial')
});

const geoserver_url = "https://geo.spatstats.com/geoserver/";
const geoserver_wms = geoserver_url + "potamap/wms";
const geoserver_wfs = geoserver_url + "potamap/ows?service=WFS&";

const OSMLayer = new Tile({
    type: 'base',
    visible: true,
    displayInLayerSwitcher: false,
    source: new XYZ({
        url:
            'https://server.arcgisonline.com/ArcGIS/rest/services/' +
            'World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    })
})

const activationLocationSource = new VectorSource({
    format: new GeoJSON(),
    attributions: "Ross Wardrup | www.rwardrup.com",
    url: function (extent) {
        return (
            geoserver_wfs +
            'version=1.0.0&request=GetFeature&typename=potamap:activation_location_w_counts&' +
            'outputFormat=application/json&srsname=EPSG:3857&' +
            'bbox=' +
            extent.join(',') +
            ',EPSG:3857'
        );
    },
    strategy: bboxStrategy,
});

const stateParkSource = new VectorSource({
    format: new GeoJSON(),
    attributions: "Ross Wardrup | www.rwardrup.com",
    url: function (extent) {
        return (
            geoserver_wfs +
            'version=1.0.0&request=GetFeature&typename=potamap:state_parks&' +
            'outputFormat=application/json&srsname=EPSG:3857&' +
            'bbox=' +
            extent.join(',') +
            ',EPSG:3857'
        );
    },
    strategy: bboxStrategy,
});

const stateParkSource_ = new TileWMS({
    url: geoserver_wms,
    params: {'LAYERS': 'potamap:state_parks',
        'TILED': true,
        'VERSION': '1.1.1',
    },
    serverType: 'geoserver',
    ratio: 1
})

const ActivationLocationStyle = function(feature, resolution) {
    const rating = feature.get('rating');
    let color;

    if (rating === 1) {
        color = 'rgba(255, 0, 0, 1.0)';  // Red for rating 1
    } else if (rating === 2) {
        color = 'rgba(255, 128, 0, 1.0)';  // Orange for rating 2
    } else if (rating === 3) {
        color = 'rgba(204, 204, 0, 1.0)';  // Yellow for rating 3
    } else if (rating === 4) {
        color = 'rgba(168, 232, 57, 1.0)';  // Lighter green for rating 4
    } else {
        color = 'rgba(70, 189, 50, 1.0)';  // Darker green for rating 5
    }

    return new Style({
        image: new Circle({
            radius: 5,
            fill: new Fill({
                color: color
            }),
            stroke: new Stroke({
                color: 'rgba(0, 0, 0, 1.0)',  // Dark border color
                width: 1
            })
        })
    });
};

var activationLocationMap = new VectorLayer({
    title: 'Activation Locations',
    visible: true,
    source: activationLocationSource,
    style: ActivationLocationStyle,
    selectable: true
});

const stateParksMap_ = new Tile({
    title: 'State Parks',
    visible: true,
    source: stateParkSource,
});

const stateParkStyle = new Style({
    fill: new Fill({
        color: 'rgba(34, 139, 34, 0.4)' // Forest green color with 40% opacity
    }),
    stroke: new Stroke({
        color: '#228B22', // Forest green color with full opacity
        width: 2 // Adjust the stroke width as desired
    }),
    image: new Circle({
        radius: 7,
        fill: new Fill({
            color: 'rgba(34, 139, 34, 0.8)' // Forest green color with 80% opacity
        }),
        stroke: new Stroke({
            color: '#228B22', // Forest green color with full opacity
            width: 2 // Adjust the stroke width as desired
        })
    })
});

const selectedStateParkStyle = new Style({
    fill: new Fill({
        color: 'rgba(34, 139, 34, 0.6)' // Forest green color with 60% opacity
    }),
    stroke: new Stroke({
        color: '#ff0000', // Red color for the stroke
        width: 3 // Adjust the stroke width as desired
    }),
    image: new Circle({
        radius: 10,
        fill: new Fill({
            color: 'rgba(34, 139, 34, 0.8)' // Forest green color with 80% opacity
        }),
        stroke: new Stroke({
            color: '#ff0000', // Red color for the circle stroke
            width: 3 // Adjust the stroke width as desired
        })
    })
});

var stateParksMap = new VectorLayer({
    title: 'State Parks',
    visible: true,
    source: stateParkSource,
    style: stateParkStyle,
    selectable: true
});

// Create a HeatmapLayer and set its source to the VectorLayer source
const minZoom = 8; // Minimum zoom level to show the heatmap layer
const maxZoom = 20; // Maximum zoom level to show the heatmap layer

const heatmapLayer = new HeatmapLayer({
    source: activationLocationSource,
    blur: 200,
    radius: 200,
    opacity: 0.5,
    gradient: ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
    minZoom: minZoom,
    maxZoom: maxZoom
});

// Get the heatmap toggle checkbox
const heatmapToggleCheckbox = document.getElementById('heatmap-toggle-checkbox');

// Toggle the visibility of the heatmap layer based on the checkbox state
heatmapToggleCheckbox.addEventListener('change', function () {
    heatmapLayer.setVisible(this.checked);
});

const highlightStyle = new Style({
    image: new Circle({
        radius: 5,
        stroke: new Stroke({
            color: 'rgba(255, 0, 0, 1.0)',
            width: 2
        }),
        fill: new Fill({
            color: 'rgba(255, 255, 0, 1.0)'  // Yellow color for highlighting
        })
    })
});

const view = new View({
    center: [0,0],
    zoom: 0,
});

let highlight;

const map = new Map({
    layers: [OSMLayer, stateParksMap, heatmapLayer, activationLocationMap],
    target: 'map',
    view: view,
    controls: defaultControls({
        attributionOptions: {
            collapsible: false
        }
    })
});

map.addControl(scaleLineControl);

// After adding the layer to the map, wait for the source to load
activationLocationSource.once('change', function() {
    if (activationLocationSource.getState() === 'ready') {
        // Get the extent of the layer's source
        var extent = activationLocationMap.getSource().getExtent();

        // Fit the view to the extent of the layer
        map.getView().fit(extent, {
            padding: [500, 500, 500, 500],  // Optional padding around the extent
            duration: 1000  // Optional animation duration in milliseconds
        });
    }
});

function getActivationDetails(activationLocationID) {
    const typeName = 'potamap:activations'; // Workspace and table name
    const filter = `<Filter><PropertyIsEqualTo><PropertyName>loc_id</PropertyName><Literal>${activationLocationID}</Literal></PropertyIsEqualTo></Filter>`;
    const outputFormat = 'application/json';
    const requestUrl = `${geoserver_wfs}version=2.0.0&request=GetFeature&typeNames=${typeName}&outputFormat=${outputFormat}&filter=${encodeURIComponent(filter)}`;

    return fetch(requestUrl)
        .then(response => response.json())
        .then(data => {
            // Assuming the WFS response data contains the activation details
            const activationDetails = data.features.map(feature => feature.properties);

            return activationDetails;
        })
        .catch(error => {
            console.error(error);
            return null;
        });
}

function getContacts(clickedActivationID) {
    const typeName = 'potamap:contacts'; // Workspace and table name
    const filter = `<Filter><PropertyIsEqualTo><PropertyName>activation_id</PropertyName><Literal>${clickedActivationID}</Literal></PropertyIsEqualTo></Filter>`;
    const outputFormat = 'application/json';

    const requestUrl = `${geoserver_wfs}version=2.0.0&request=GetFeature&typeNames=${typeName}&outputFormat=${outputFormat}&filter=${encodeURIComponent(filter)}`;

    return fetch(requestUrl)
        .then(response => response.json())
        .then(data => {
            // Assuming the WFS response data contains the contacts
            const contacts = data.features.map(feature => feature.properties);

            return contacts;
        })
        .catch(error => {
            console.error(error);
            return null;
        });
}

function showHideActivationDetailsDialog(action){
    const dialogElement = document.getElementById('activationInfo');
    if (action === "show") {
        dialogElement.classList.remove('hidden');
    } else {
        dialogElement.classList.add('hidden');
    }

}

function showActivationDetailsDialog(activationDetailsPromise) {
    showHideActivationDetailsDialog("show");

    activationDetailsPromise
        .then(activationDetails => {
            const activationInfoElement = document.getElementById('activationInfo');
            activationInfoElement.innerHTML = ""; // Clear existing content

            const tableElement = document.createElement('table');
            tableElement.classList.add('styled-table');

            const theadElement = document.createElement('thead');
            const tbodyElement = document.createElement('tbody');

            const titleRowElement = document.createElement('tr');
            const titleCellElement = document.createElement('th');
            titleCellElement.colSpan = 3; // Updated colspan to include the new column
            titleCellElement.classList.add('table-title');
            titleCellElement.textContent = 'Activations';
            titleRowElement.appendChild(titleCellElement);
            theadElement.appendChild(titleRowElement);

            const headerRowElement = document.createElement('tr');
            const dateHeaderCellElement = document.createElement('th');
            dateHeaderCellElement.textContent = 'Date';
            const validHeaderCellElement = document.createElement('th');
            validHeaderCellElement.textContent = 'Valid Activation?'; // New header for the new column
            const emptyHeaderCellElement = document.createElement('th');
            headerRowElement.appendChild(dateHeaderCellElement);
            headerRowElement.appendChild(validHeaderCellElement);
            headerRowElement.appendChild(emptyHeaderCellElement);
            theadElement.appendChild(headerRowElement);

            activationDetails.forEach(activation => {
                if (activation.hasOwnProperty('date')) {
                    const cleanedDate = activation.date.slice(0, -1);
                    const rowElement = document.createElement('tr');
                    rowElement.classList.add('active-row'); // Add active-row class to all rows
                    const dateCellElement = document.createElement('td');
                    dateCellElement.textContent = cleanedDate;
                    const validCellElement = document.createElement('td');
                    validCellElement.textContent = activation.is_valid ? 'Yes' : 'No'; // Example: Assuming valid property is boolean
                    const emptyCellElement = document.createElement('td');
                    rowElement.appendChild(dateCellElement);
                    rowElement.appendChild(validCellElement);
                    rowElement.appendChild(emptyCellElement);
                    tbodyElement.appendChild(rowElement);
                }
            });

            tableElement.appendChild(theadElement);
            tableElement.appendChild(tbodyElement);
            activationInfoElement.appendChild(tableElement);
        })
        .catch(error => {
            console.error(error);
            // Handle the error case
        });
}

function showContactsDialog(contacts) {
    // Assuming you have an existing HTML element with the ID "contactsDialog" to hold the dialog content
    const dialogElement = document.getElementById('contactsDialog');
    dialogElement.classList.remove('hidden');
    // Clear the existing content
    dialogElement.innerHTML = '';

    // Create and append HTML elements to display the contacts
    const titleElement = document.createElement('h2');
    titleElement.textContent = 'Contacts';
    dialogElement.appendChild(titleElement);

    // Assuming contacts is an array of contact objects with properties like 'name', 'callsign', 'frequency', etc.
    if (contacts.length > 0) {
        const contactsList = document.createElement('ul');

        contacts.forEach(contact => {
            const contactItem = document.createElement('li');
            contactItem.textContent = `Name: ${contact.name}, Callsign: ${contact.callsign}, Frequency: ${contact.frequency}`;
            contactsList.appendChild(contactItem);
        });

        dialogElement.appendChild(contactsList);
    } else {
        const noContactsElement = document.createElement('p');
        noContactsElement.textContent = 'No contacts found.';
        dialogElement.appendChild(noContactsElement);
    }

    // Assuming you have a close button element with the ID "closeContactsDialog" to close the dialog
    const closeButton = document.getElementById('closeContactsDialog');
    closeButton.addEventListener('click', function() {
        // Hide or remove the dialog
        dialogElement.style.display = 'none';
    });

    // Display the dialog
    dialogElement.style.display = 'block';
}
map.on('singleclick', function (evt) {
    document.getElementById('info').innerHTML = '';
    let features = undefined;
    map.forEachFeatureAtPixel(
        evt.pixel,
        function (feature) {
            if (!features) {
                // Select the first feature encountered
                features = feature;
            }
        },
        {
            hitTolerance: 15,
            layerFilter: function (layer) {
                // Optionally, you can specify the layers to consider for feature selection
                return layer.get('selectable'); // Set a custom property like 'selectable' on the layers you want to include
            },
            multi: false // Ensure only one feature is selected
        }
    );

    if (features !== highlight) {
        if (highlight) {
            if (highlight.id_.includes("activation_location_w_counts")) {
                highlight.setStyle(ActivationLocationStyle);
                showHideActivationDetailsDialog("hide");
            } else if (highlight.id_.includes("state_parks")) {
                highlight.setStyle(stateParkStyle);
            }
        }
        if (features) {
            console.log("Hightlighting feature");
            if (features.id_.includes("activation_location_w_counts")) {
                features.setStyle(highlightStyle);
            } else if (features.id_.includes("state_parks")) {
                features.setStyle(selectedStateParkStyle);
            }
        }
        highlight = features;
    }
    if (features !== undefined) {
        const feature_id = features.id_;

        if (feature_id.includes("activation_location_w_counts")) {
            const notes = features.get("notes");
            const activation_count = features.get("activation_count");
            const park_name = features.get("park_name");
            const park_id = features.get("park_id");
            
            // Get data to build activations and contacts tables
            const activationLocationID = features.get("id");
            const activationDetails = getActivationDetails(activationLocationID);

            document.getElementById('info').innerHTML =
                "<table class=\"styled-table\">\n" +
                "    <thead>\n" +
                "      <tr><th colspan='5' class='table-title'>Activation Location</th></tr>" +
                "        <tr>\n" +
                "            <th>Park Name</th>\n" +
                "            <th>Park ID</th>\n" +
                "            <th>Notes</th>" +
                "             <th>Act. Count</th>" +
                "            <th></th>\n" +
                "        </tr>\n" +
                "    </thead>\n" +
                "    <tbody>\n" +
                "        <tr class=\"active-row\">\n" +
                "            <td>park_name</td>\n".replaceAll("park_name", park_name) +
                "            <td>park_id</td>\n".replace("park_id", park_id) +
                "            <td>notes</td>\n".replace("notes", notes) +
                "            <td>count</td>\n".replace("count", activation_count) +
                "            <td></td>" +
                "        </tr>\n" +
                "        <!-- and so on... -->\n" +
                "    </tbody>\n" +
                "</table>"

            //displayFeatureInfo(evt.pixel);
            showActivationDetailsDialog(activationDetails);
        } else if (feature_id.includes("state_parks")) {
            const area = features.get("acres");
            const park_name = features.get("propname");

            document.getElementById('info').innerHTML =
                "<table class=\"styled-table\">\n" +
                "    <thead>\n" +
                "      <tr><th colspan='5' class='table-title'>Park Info</th></tr>" +
                "        <tr>\n" +
                "            <th>Park Name</th>\n" +
                "            <th>Acreage</th>\n" +
                "            <th></th>\n" +
                "        </tr>\n" +
                "    </thead>\n" +
                "    <tbody>\n" +
                "        <tr class=\"active-row\">\n" +
                "            <td>park_name</td>\n".replaceAll("park_name", park_name) +
                "            <td>acres</td>\n".replace("acres", number.toFixed(parseFloat(area), 2).toString()) +
                "            <td></td>" +
                "        </tr>\n" +
                "        <!-- and so on... -->\n" +
                "    </tbody>\n" +
                "</table>"
        }
    } else {
        console.log("Clicked on undefined feature");
    }

    // click event listener to activations within the first dialog
    const activationElements = document.querySelectorAll('.activation-element');
    activationElements.forEach(element => {
        element.addEventListener('click', function(event) {
            const clickedActivationID = event.target.dataset.activationId;

            // Step 8: Query the contacts table using clickedActivationID
            const contacts = getContacts(clickedActivationID);

            // Step 9: Display contacts in the second dialog or window
            showContactsDialog(contacts);
        });
    });
});

const attribution = new Attribution({
    collapsible: false
})

// Build legend
window.onload = function () {
    document.getElementById('map-legend').innerHTML =
        "<table class=\"styled-legend\">\n" +
        "    <thead>\n" +
        "      <tr><th colspan='3' class='table-title'>Location Rating</th></tr>" +
        "        <tr>\n" +
        "            <th></th>\n" +
        "            <th></th>\n" +
        "            <th></th>\n" +
        "        </tr>" +
        "    </thead>\n" +
        "    <tbody>\n" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"five\"></span></td>\n" +
        "            <td>5</td>" +
        "            <td></td>" +
        "        </tr>\n" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"four\"></span></td>\n" +
        "            <td>4</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"three\"></span></td>\n" +
        "            <td>3</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"two\"></span></td>\n" +
        "            <td>2</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"one\"></span></td>\n" +
        "            <td>1</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        </tr>\n" +
        "    </tbody>\n" +
        "</table>"
}