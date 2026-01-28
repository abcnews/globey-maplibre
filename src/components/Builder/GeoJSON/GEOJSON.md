# GeoJSON & Topojson in the Builder

You can upload your TopoJSON & GeoJSON file to a public location, then link them into the builder to use in your interactive.

## Usage

1. Source your GeoJSON or TopoJSON file (henceforth GeoJSON file)
1. For ABC users, upload your GeoJSON to ContentFTP or [CoreMedia](https://abcportal.sharepoint.com/:fl:/r/contentstorage/CSP_f8c71d55-a504-4586-a9a0-0d01bb1b3b62/Document%20Library/LoopAppData/Custom%20data%20files%20in%20CoreMedia.loop?d=wcdaa48c619104de9830d19821a1c9112&csf=1&web=1&e=zU54PT&nav=cz0lMkZjb250ZW50c3RvcmFnZSUyRkNTUF9mOGM3MWQ1NS1hNTA0LTQ1ODYtYTlhMC0wZDAxYmIxYjNiNjImZD1iJTIxVlIzSC1BU2xoa1dwb0EwQnV4czdZbDdfbGJTbm1jRkxoMGRFb213NmJINGh5bERSb2hHVFFySXFiLXh4MXNOaSZmPTAxTE1FVllCNkdKQ1ZNMkVBWjVGR1lHRElaUUlOQlpFSVMmYz0lMkYmYT1Mb29wQXBwJnA9JTQwZmx1aWR4JTJGbG9vcC1wYWdlLWNvbnRhaW5lciZ4PSU3QiUyMnclMjIlM0ElMjJUMFJUVUh4aFltTndiM0owWVd3dWMyaGhjbVZ3YjJsdWRDNWpiMjE4WWlGV1VqTklMVUZUYkdoclYzQnZRVEJDZFhoek4xbHNOMTlzWWxOdWJXTkdUR2d3WkVWdmJYYzJZa2cwYUhsc1JGSnZhRWRVVVhKSmNXSXRlSGd4YzA1cGZEQXhURTFGVmxsQ01qVlZUMDlGUkVoRlEwRlNTRmxCUXpOSE4wbE9Ra1ZUTTAwJTNEJTIyJTJDJTIyaSUyMiUzQSUyMjhkZDI1MGJlLThjMzUtNDkwMC05ZmFiLWM0OGM5YjM4YjEyMyUyMiU3RA%3D%3D)
1. Paste the link to the public GeoJSON file into the builder. The builder will download and show filter and styling options.

### Filtering
You can show and hide features in your GeoJSON file by filtering them out. The builder lets you show and hide elements in your GeoJSON by picking a property to filter by, and choosing which values to show. 

For instance if your GeoJSON features all have a "type" property, you can filter them by type:

1. Choose filter property: "type"
2. Choose one or more types to show, e.g. "US", "China"

### Styling

There are several ways to style your GeoJSON features:

1. *Simplestyle*
    Set bespoke colour and style properties in your GeoJSON file. If you're using geojson.io you can set simple style props in the gui by opening a feature and clicking "add simplestyle properties". This feature should be used sparingly, because the default values have been designed with accessibility and contrast in mind.
2. *Colour Scale*
    If your GeoJSON data has data properties, you can 
3. *Class Based*
4. *Override*