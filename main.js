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
const geoserver_wfs = geoserver_url + "ows?service=WFS&";

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

const activationLocationSource = new TileWMS({
    url: geoserver_wms,
    params: {
        'LAYERS': 'potamap:activation_locations',
        'TILED': true,
        'VERSION': '1.1.1',
    },
    serverType: 'geoserver',
    ratio: 1
})

const activationLocationMap = new TileLayer({
    title: 'POTA Activation Locations',
    visible: true,
    source: activationLocationSource
})

const highlightStyle = new Style({
    image: new Circle({
        radius: 5,
        fill: new Fill({
            color: 'rgba(228, 26, 28, 1.0)'
        }),
    })
});

const RemoteHeardOpStyle = new Style({
    image: new Circle({
        radius: 5,
        fill: new Fill({
            color: 'rgba(55, 126, 184, 1.0)'
        }),
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
    const activationLocationInfo = activationLocationSource.getFeatureInfoUrl(
        evt.coordinate,
        viewResolution,
        'EPSG:3857',
        {'INFO_FORMAT': 'application/json'}
    )

    if (activationLocationInfo && activationLocationMap.getVisible() === true) {
        fetch(activationLocationInfo)
            .then(function (response) { return response.text(); })
            .then(function (json) {
                let inf = JSON.parse(json).features;
                console.log(inf)
                if (inf.length > 0) {
                    inf = inf[0].properties

                    document.getElementById('info').innerHTML =
                        "<table class=\"styled-table\">\n" +
                        "    <thead>\n" +
                        "      <tr><th colspan='3' class='table-title'>Path Members</th></tr>" +
                        "        <tr>\n" +
                        "            <th>Call A</th>\n" +
                        "            <th>Call B</th>\n" +
                        "            <th>Via</th>\n" +
                        "        </tr>\n" +
                        "    </thead>\n" +
                        "    <tbody>\n" +
                        "        <tr class=\"active-row\">\n" +
                        "            <td>call</td>\n".replace("call", "call_a") +
                        "            <td>call</td>\n".replace("call", "call_b") +
                        "            <td>via</td>\n".replace("via", "parent_node") +
                        "        </tr>\n" +
                        "        <!-- and so on... -->\n" +
                        "    </tbody>\n" +
                        "</table>";

                }
            })
    }

    if (features !== highlight) {
        if (highlight) {
            if (highlight.id_.includes("Node")) {
                highlight.setStyle(NodeStyle);
            } else if (highlight.id_.includes("Remote_Operators")) {
                highlight.setStyle(RemoteHeardOpStyle);
            } else if (highlight.id_.includes("Operator")) {
                highlight.setStyle(DirectHeardOPStyle);
            } else if (highlight.id_.includes("Remote_Digipeater")) {
                highlight.setStyle(RemoteDigiStyle);
            } else if (highlight.id_.includes("Digipeater")) {
                highlight.setStyle(DirectHeardDigiStyle);
            }
        }
        if (features) {
            console.log("Hightlighting feature");
            features.setStyle(highlightStyle);
        }
        highlight = features;
    }
    if (features !== undefined) {
        const call = features.get("call");
        const grid = features.get("grid");
        const feature_id = features.id_;

        if (feature_id.includes("Remote_Operators")) {
            feature_type = "Remote Operator";
            const call = features.get("remote_call");
            const digi_last_heard = features.get("lastheard");
            const digi_formatted_lh = new Date(digi_last_heard).toLocaleString('en-US',
                {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'});

            const port_name = features.get('port').split(" ");

            let bands = features.get("bands")
            console.log(bands);
            if (bands !== undefined && bands !== null) {
                bands = bands.replace(/(^,)|(,$)/g, "");
                bands = replace_band_order(bands).replace(/,/g, ', ');  // 40CM, 2M, 20M, then 40M
            } else {
                bands = "Unknown";
            }

            document.getElementById('info').innerHTML =
                "<table class=\"styled-table\">\n" +
                "    <thead>\n" +
                "      <tr><th colspan='5' class='table-title'>Operator</th></tr>" +
                "        <tr>\n" +
                "            <th>Call</th>\n" +
                "            <th>Grid</th>\n" +
                "            <th>Heard On\n</th>" +
                "            <th>Last Seen</th>\n" +
                "            <th></th>\n" +
                "        </tr>\n" +
                "    </thead>\n" +
                "    <tbody>\n" +
                "        <tr class=\"active-row\">\n" +
                "            <td><a href=\https://www.qrz.com/db/call target='_blank' \>call</a></td>\n".replaceAll("call", call) +
                "            <td>grid</td>\n".replace("grid", grid) +
                "            <td>bands</td>\n".replace("bands", bands) +
                "            <td>last_heard</td>\n".replace("last_heard", digi_formatted_lh) +
                "            <td></td>" +
                "        </tr>\n" +
                "        <!-- and so on... -->\n" +
                "    </tbody>\n" +
                "</table>"

        }

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
        "      <tr><th colspan='3' class='table-title'>Legend</th></tr>" +
        "        <tr>\n" +
        "            <th></th>\n" +
        "            <th></th>\n" +
        "            <th></th>\n" +
        "        </tr>" +
        "    </thead>\n" +
        "    <tbody>\n" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"local-op-dot\"></span></td>\n" +
        "            <td>Local Operator</td>" +
        "            <td></td>" +
        "        </tr>\n" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"local-digi-dot\"></span></td>\n" +
        "            <td>Local Digipeater</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"node-dot\"></span></td>\n" +
        "            <td>NET/ROM Node</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"remote-digi-dot\"></span></td>\n" +
        "            <td>Digipeater</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        <tr class=\"active-row\">\n" +
        "            <td><span class=\"remote-op-dot\"></span></td>\n" +
        "            <td>Operator</td>\n" +
        "            <td></td>" +
        "        </tr>" +
        "        </tr>\n" +
        "    </tbody>\n" +
        "</table>"
}