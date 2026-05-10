declare module 'leaflet.markercluster' {
  import * as L from 'leaflet';

  interface MarkerClusterGroupOptions {
    maxClusterRadius?: number | ((zoom: number) => number);
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon;
    singleMarkerMode?: boolean;
    disableClusteringAtZoom?: number | false;
    removeOutsideVisibleBounds?: boolean;
    animate?: boolean;
    animateAddingMarkers?: boolean;
    spiderfyDistanceMultiplier?: number;
    spiderLegPolylineOptions?: L.PolylineOptions;
    chunkedLoading?: boolean;
    chunkInterval?: number;
    chunkDelay?: number;
    chunkProgress?: (processed: number, total: number, elapsed: number) => void;
  }

  interface MarkerClusterGroup extends L.LayerGroup {
    addLayer(layer: L.Layer): MarkerClusterGroup;
    removeLayer(layer: L.Layer): MarkerClusterGroup;
    clearLayers(): MarkerClusterGroup;
    getChildCount(): number;
    getAllChildMarkers(): L.Marker[];
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}
