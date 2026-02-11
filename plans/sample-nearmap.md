We want to add another button next to paste kmz to let users paste from a Nearmap URL. Nearmap doesn't give us coordinates with the imagery that we download, but we can calculate it from the url, e.g.:

https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.4809010,153.0041531,18.00z,0d/V/20241106
or
https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.3543504,153.4189669,18.00z,0d/V/20240611

To calculate the bounding box (BBOX) from a center point and zoom level, you have to convert the latitude and longitude into **pixel coordinates** (or "tiles") based on the Web Mercator projection, determine how much of the "world" is visible in the container, and convert back.

In MapLibre (and Mapbox), the world at zoom 0 is a single  pixel tile. Each zoom level increases the total pixels by .

### The Math

To get the boundaries, we use the following relationship:


---

## JavaScript Function

This function calculates the North, South, East, and West bounds. It assumes you are using a standard  tile size.

```javascript
/**
 * Calculates the bounding box for a MapLibre map.
 * @param {number} lat - Latitude of center
 * @param {number} lon - Longitude of center
 * @param {number} zoom - Zoom level
 * @param {number} width - Width of the map container in pixels
 * @param {number} height - Height of the map container in pixels
 * @returns {Object} - { sw: [lon, lat], ne: [lon, lat] }
 */
function getBBox(lat, lon, zoom, width, height) {
    const worldSize = 256 * Math.pow(2, zoom);

    // Convert Lat/Lon to "World Pixels"
    function project(lat, lon) {
        const siny = Math.sin(lat * Math.PI / 180);
        const y = 0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI);
        const x = 0.5 + lon / 360;
        return { 
            x: x * worldSize, 
            y: y * worldSize 
        };
    }

    // Convert "World Pixels" back to Lat/Lon
    function unproject(x, y) {
        const lon = (x / worldSize - 0.5) * 360;
        const y2 = (y / worldSize - 0.5) * -2 * Math.PI;
        const lat = (2 * Math.atan(Math.exp(y2)) - Math.PI / 2) * 180 / Math.PI;
        return [lon, lat];
    }

    const center = project(lat, lon);

    // Find the corners by offseting half the container dimensions
    const sw = unproject(center.x - width / 2, center.y + height / 2);
    const ne = unproject(center.x + width / 2, center.y - height / 2);

    return { sw, ne };
}

// Example usage based on your Nearmap link:
const bounds = getBBox(-27.4809, 153.0041, 18.0, 1920, 1080);
console.log(bounds);

```

### Important Considerations:

* **Container Dimensions:** Since zoom level defines the scale of the map, the bounding box changes depending on how large your browser window is. A zoom 18 on a phone shows much less area than zoom 18 on a 4K monitor.
* **The Nearmap Link:** Your example link contains `0d` (pitch) and `/V/` (vertical/ortho). If the map is tilted (pitch > 0), this math becomes significantly more complex because the "top" of the map sees further into the distance than the "bottom." The function above assumes a **top-down (0° pitch)** view. We should alert() to explain that the resulting calculation may be inaccurate.
  * example map link that should trigger a warning: https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.3546586,153.4187044,17.00z,101d/V/20240611
