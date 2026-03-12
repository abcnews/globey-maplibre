# Multi-Filter GeoJSON Styling

This document outlines the multi-filter styling feature for GeoJSON layers in Globey.

## Overview

The multi-filter styling system allows you to define multiple rendering rules for a single GeoJSON source. This is useful for data where different segments (e.g., different countries, categories, or ranges) require distinct visual styles.

### Key Concepts

- **Style Rule**: A combination of a filter and a style configuration.
- **Filter**: Specifies which features the rule applies to, based on GeoJSON properties.
- **Sequential Evaluation**: Features are matched against style rules in the order they appear in the builder. The first matching rule's style is applied.
- **Default Style**: Features that don't match any specific filter rule can be hidden or shown with a default appearance.

## Configuration

In the GeoJSON builder, you can add multiple "Styles" to a layer. Each style contains:

### 1. Rule Name

An optional friendly name to identify the style group in the configuration UI.

### 2. Filter

Define which features this rule applies to.

- **Property**: The GeoJSON property to filter on.
- **Values**: The specific values that match this rule.

### 3. Colour Mode

- **Simple Style**: Uses `fill`, `stroke`, or `marker-color` properties directly from the GeoJSON features.
- **Colour Scale**: Interpolates colours based on a numeric property value.
- **Class Based**: Maps property values to predefined category colours.
- **Basic**: Applies a single fixed colour to all matching features.

### 4. Size (Points & Lines)

- **Point Size**: Adjust the radius of points or diameter of spikes.
- **Line Width**: Adjust the thickness of line segments.
- Supports both Pixel (`p`) and Kilometre (`k`) units.

## Technical Implementation

Under the hood, Globey converts these style rules into complex MapLibre GL expressions using the `case` operator. This ensures that even with dozens of rules, styling is evaluated efficiently on the GPU.

For advanced rendering types like **Spikes**, Globey evaluates these rules in real-time during the feature processing stage to synchronize 3D heights and colours.

## Use Cases

- **Comparative Data**: Style US investments in blue and Chinese investments in red.
- **Segmented Scales**: Apply a green-to-blue scale for "Low Risk" categories and a yellow-to-red scale for "High Risk" categories.
- **Highlighting**: Create a filter for a specific feature by name and set its colour to "Basic" to make it stand out.
