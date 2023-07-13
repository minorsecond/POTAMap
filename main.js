import 'ol/ol.css';
import LayerGroup from 'ol/layer/Group'
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS'
import View from 'ol/View';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {bbox as bboxStrategy} from 'ol/loadingstrategy'
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {Style, Circle, Fill, Stroke} from 'ol/style';
import {Attribution, defaults as defaultControls} from 'ol/control'
import XYZ from "ol/source/XYZ";

const geoserver_url = "https://geo.spatstats.com/geoserver/";
const geoserver_wms = geoserver_url + "potamap/wms";
const geoserver_wfs = geoserver_url + "potamap/ows?service=WFS&";

const OSMLayer = new TileLayer({
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
    attributions: "R.R. Wardrup | www.rwardrup.com",
    url: function (extent) {
        return (
            geoserver_wfs +
            'version=1.0.0&request=GetFeature&typename=potamap:activation_locations&' +
            'outputFormat=application/json&srsname=EPSG:3857&' +
            'bbox=' +
            extent.join(',') +
            ',EPSG:3857'
        );
    },
    strategy: bboxStrategy,
});

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
    layers: [OSMLayer, activationLocationMap],
    target: 'map',
    view: view,
    controls: defaultControls({
        attributionOptions: {
            collapsible: false
        }
    })
});

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

map.on('singleclick', function (evt) {
    document.getElementById('info').innerHTML = '';
    let feature_type = undefined;
    let features = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            return feature;
        },
        {
            hitTolerance: 15
        });

    const viewResolution = /** @type {number} */ (view.getResolution());

    if (features !== highlight) {
        if (highlight) {
            highlight.setStyle(ActivationLocationStyle)
        }
        if (features) {
            console.log("Hightlighting feature");
            features.setStyle(highlightStyle);
        }
        highlight = features;
    }
    if (features !== undefined) {
        const park_name = features.get("park_name");
        const park_id = features.get("park_id");
        const notes = features.get("notes");

        document.getElementById('info').innerHTML =
            "<table class=\"styled-table\">\n" +
            "    <thead>\n" +
            "      <tr><th colspan='5' class='table-title'>Activation Location</th></tr>" +
            "        <tr>\n" +
            "            <th>Park Name</th>\n" +
            "            <th>Park ID</th>\n" +
            "            <th>Notes</th>" +
            "            <th></th>\n" +
            "        </tr>\n" +
            "    </thead>\n" +
            "    <tbody>\n" +
            "        <tr class=\"active-row\">\n" +
            "            <td>park_name</td>\n".replaceAll("park_name", park_name) +
            "            <td>park_id</td>\n".replace("park_id", park_id) +
            "            <td>notes</td>\n".replace("notes", notes) +
            "            <td></td>" +
            "        </tr>\n" +
            "        <!-- and so on... -->\n" +
            "    </tbody>\n" +
            "</table>"

        console.log(feature_type);
        //displayFeatureInfo(evt.pixel);
    } else {
        console.log("Clicked on undefined feature");
    }
});

const attribution = new Attribution({
    collapsible: false
})

// Build legend
window.onload = function () {
    document.getElementById('map-legend').innerHTML =
        "<table class=\"styled-legend\">\n" +
        "    <thead>\n" +
        "      <tr><th colspan='3' class='table-title'>Rating</th></tr>" +
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