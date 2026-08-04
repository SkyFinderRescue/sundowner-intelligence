"use strict";
(function installSundownerBasemaps(){
  if(!window.L||!L.tileLayer)return;
  const originalTileLayer=L.tileLayer.bind(L);
  const OSM="tile.openstreetmap.org";
  L.tileLayer=function(url,options){
    if(!String(url).includes(OSM))return originalTileLayer(url,options);

    const topo=originalTileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      {maxZoom:19,attribution:"Tiles © Esri — Sources: Esri, USGS, NOAA"}
    );
    const imagery=originalTileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {maxZoom:19,attribution:"Tiles © Esri"}
    );
    const labels=originalTileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {maxZoom:19,attribution:"Labels © Esri"}
    );
    const satellite=L.layerGroup([imagery,labels]);
    let active=topo;
    const originalAddTo=topo.addTo.bind(topo);

    topo.addTo=function(mapInstance){
      originalAddTo(mapInstance);
      const control=L.control({position:"topright"});
      control.onAdd=function(){
        const box=L.DomUtil.create("div","basemap-toggle");
        box.innerHTML='<button type="button" class="active" data-map="topo">Topographic</button><button type="button" data-map="satellite">Satellite</button>';
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.disableScrollPropagation(box);
        const buttons=[...box.querySelectorAll("button")];
        function select(layer,name){
          if(active!==layer){
            if(mapInstance.hasLayer(active))mapInstance.removeLayer(active);
            active=layer;
            mapInstance.addLayer(active);
          }
          buttons.forEach(button=>button.classList.toggle("active",button.dataset.map===name));
        }
        buttons[0].addEventListener("click",()=>select(topo,"topo"));
        buttons[1].addEventListener("click",()=>select(satellite,"satellite"));
        return box;
      };
      control.addTo(mapInstance);
      return topo;
    };
    return topo;
  };
})();
