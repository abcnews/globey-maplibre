# GeoJSON & Topojson in the Builder

You can upload your TopoJSON & GeoJSON file to a public location, then link them into the builder to use in your interactive.

## Usage

1. Source your GeoJSON or TopoJSON file (henceforth GeoJSON file)
1. For ABC users, upload your GeoJSON to ContentFTP or [CoreMedia](https://abcportal.sharepoint.com/:fl:/r/contentstorage/CSP_f8c71d55-a504-4586-a9a0-0d01bb1b3b62/Document%20Library/LoopAppData/Custom%20data%20files%20in%20CoreMedia.loop?d=wcdaa48c619104de9830d19821a1c9112&csf=1&web=1&e=zU54PT&nav=cz0lMkZjb250ZW50c3RvcmFnZSUyRkNTUF9mOGM3MWQ1NS1hNTA0LTQ1ODYtYTlhMC0wZDAxYmIxYjNiNjImZD1iJTIxVlIzSC1BU2xoa1dwb0EwQnV4czdZbDdfbGJTbm1jRkxoMGRFb213NmJINGh5bERSb2hHVFFySXFiLXh4MXNOaSZmPTAxTE1FVllCNkdKQ1ZNMkVBWjVGR1lHRElaUUlOQlpFSVMmYz0lMkYmYT1Mb29wQXBwJnA9JTQwZmx1aWR4JTJGbG9vcC1wYWdlLWNvbnRhaW5lciZ4PSU3QiUyMnclMjIlM0ElMjJUMFJUVUh4aFltTndiM0owWVd3dWMyaGhjbVZ3YjJsdWRDNWpiMjE4WWlGV1VqTklMVUZUYkdoclYzQnZRVEJDZFhoek4xbHNOMTlzWWxOdWJXTkdUR2d3WkVWdmJYYzJZa2cwYUhsc1JGSnZhRWRVVVhKSmNXSXRlSGd4YzA1cGZEQXhURTFGVmxsQ01qVlZUMDlGUkVoRlEwRlNTRmxCUXpOSE4wbE9Ra1ZUTTAwJTNEJTIyJTJDJTIyaSUyMiUzQSUyMjhkZDI1MGJlLThjMzUtNDkwMC05ZmFiLWM0OGM5YjM4YjEyMyUyMiU3RA%3D%3D)
1. Paste the link to the public GeoJSON file into the builder. The builder will download and show filter and styling options.

### Viz types

The globe supports these visualisation types:

- Areas - Show areas on the map (e.g. areas burnt by bushfires)
- Lines - Show lines on the map (e.g. shipping routes)
- Points - Draw dots for each point (e.g. locations and status of coral reefs)
- Spikes - Draw spikes at the location of your GeoJSON features (e.g. megawattage of solar farms at a point)

### Filtering

The builder lets you show and hide elements in your GeoJSON by picking a property to filter by, and choosing which values to show.

For instance if your GeoJSON features all have a "type" property, you can filter them by type:

1. Choose filter property: "type"
2. Choose one or more types to show, e.g. "US", "China"

### Styling

There are several options to style your GeoJSON features:

1. _Colour scale_
   If your GeoJSON data has numeric properties, you can use a colour scale to style your features.

   Choose "Colour scale", then pick the property you want to scale on (e.g., `bleaching_2025_01`). In a scrollyteller context you can swap to a new property on the fly to transition between datasets.

   The **pallette type** and **distribution graph** will appear, so you can choose your colour scheme and how to scale the colours.

   The **distribution graph** will appear, showing how your data is spread. This histogram helps you see where most of your data points lie. You can use the **draggable handles** or the numeric input boxes to set your `min` and `max` values:

1. _Class Based_
   If you process your GeoJSON to have class properties, you can specify standard ABC styles for each of your features TBD.
1. _Simplestyle_
   Set bespoke colour and style properties in your GeoJSON file. If you're using geojson.io you can set simple style props in the gui by opening a feature and clicking "add simplestyle properties". This feature should be used sparingly, because the default values have been designed with accessibility and contrast in mind.
1. _Override_
   Completely override the style in your GeoJSON to do whatever you like from the builder. This feature should be used sparingly, because the default values have been designed with accessibility and contrast in mind.
