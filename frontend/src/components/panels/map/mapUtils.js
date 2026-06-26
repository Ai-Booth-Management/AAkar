export const COLOR_MAP = {
    "Very High": { fill: "#ef4444", border: "#b91c1c" },
    "High": { fill: "#f97316", border: "#c2410c" },
    "Medium": { fill: "#eab308", border: "#a16207" },
    "Low": { fill: "#22c55e", border: "#15803d" },
    "Very Low": { fill: "#16a34a", border: "#166534" }
};

export const getDensityLevel = (activeCount) => {
    if (activeCount >= 12) return "Very High";
    if (activeCount >= 6) return "High";
    if (activeCount >= 3) return "Medium";
    if (activeCount >= 1) return "Low";
    return "Very Low";
};

export const getReportForDistrict = (districtMetrics, districtName, category) => {
    const d = districtMetrics[districtName];
    if (!d) return getAggregateReport(districtMetrics, category);
    const lookupKey = category === "All" ? "Total" : category;
    const total = d.complaints[lookupKey] || 0;
    const active = d.active[lookupKey] || 0;
    const solved = d.solved[lookupKey] || 0;

    const categoryReports = {
        "Sanitation": {
            what: `• Sanitation grid overload: ${active} active dumpsite backlogs.\n• Waste clearance rate dropped by 14% this week.`,
            where: `• ${districtName} high-density market zones.\n• Transit collection points.`,
            who: d.details.Sanitation.who,
            action: `• Cleared ${solved} dump locations.\n• Dispatched 2 additional municipal compactors.`,
            pending: `• Procurement approval for 15 heavy-litter bins.`
        },
        "Water": {
            what: `• Distribution supply pressure deficit affecting ${active} local supply nodes.\n• Supply lines pressure dropped below standard 1.4 bar.`,
            where: `• ${districtName} Wards.\n• Low-lying residential clusters.`,
            who: d.details.Water.who,
            action: `• Serviced feeder control valves at zonal station.\n• Cleared and repaired ${solved} leakage points.`,
            pending: `• Zonal permit for pipeline trenching and replacement.`
        },
        "Roads": {
            what: `• Pavement structural degradation: ${active} active pothole sectors.\n• Vehicular transit speed dropped to average 18 km/h.`,
            where: `• ${districtName} primary corridor loops.\n• Arterial highway connector lanes.`,
            who: d.details.Roads.who,
            action: `• Executed cold-mix patchwork overlay across ${solved} locations.`,
            pending: `• Traffic Police NOC for hot-mix resurfacing phases.`
        },
        "Electricity": {
            what: `• Voltage fluctuation anomalies: ${active} transformer sectors reporting overloading during peak hours.`,
            where: `• ${districtName} Walled markets.\n• Inner localized alley circuits.`,
            who: d.details.Electricity.who,
            action: `• Rerouted load circuit to secondary transformer nodes.\n• Anchored and insulated ${solved} overhead sagging lines.`,
            pending: `• Space allocation approval for underground transformer pods.`
        },
        "All": {
            what: `• Total of ${total} registered hotline complaints (${active} active).\n• Sanitation (${d.complaints.Sanitation}) & Water leaks (${d.complaints.Water}) comprise 60% of logs.`,
            where: `• ${districtName} residential wards & central markets.`,
            who: `• ${districtName} Zonal Coordination Command Center`,
            action: `• Resolved ${solved} hotline issues.\n• Dispatched municipal cleaners and water valve crews.`,
            pending: `• Digging permits and road cutting NOCs from PWD.`
        }
    };

    return categoryReports[category] || categoryReports["All"];
};

export const getAggregateReport = (districtMetrics, category) => {
    let total = 0;
    let solved = 0;
    let active = 0;
    let sanitation = 0;
    let water = 0;

    const lookupKey = category === "All" ? "Total" : category;

    Object.values(districtMetrics).forEach(d => {
        total += d.complaints[lookupKey] || 0;
        solved += d.solved[lookupKey] || 0;
        active += d.active[lookupKey] || 0;
        sanitation += d.complaints.Sanitation || 0;
        water += d.complaints.Water || 0;
    });

    const categoryReports = {
        "Sanitation": {
            what: `• Aggregate surge of ${total} sanitation complaints (${active} active).\n• Daily garbage output exceeded processing capacity by 15% in hotspots.`,
            where: `• Central Delhi (15 cases) & South Delhi (8 cases).`,
            who: `• Joint Commissioner of Waste Management & Zonal Directors`,
            action: `• Cleared ${solved} garbage dumps.\n• Activated 4 municipal composters.`,
            pending: `• Site clearance for solid waste treatment facility.`
        },
        "Water": {
            what: `• Total of ${total} water supply complaints registered (${active} active).\n• Supply contamination reports in residential zones.`,
            where: `• Central Delhi (13 cases) & South Delhi (8 cases).`,
            who: `• DJB Chief Engineer & Zonal Superintendent Engineers`,
            action: `• Resolved ${solved} water leakage cases.\n• Deployed auxiliary supply lines.`,
            pending: `• Approvals for major reservoir trunk line replacement.`
        },
        "Roads": {
            what: `• Pavement damage and potholes accumulate ${total} reports (${active} active).\n• Vehicle flow rate dropped by average 14% on affected arterials.`,
            where: `• Central District (11 cases) & South District (6 cases).`,
            who: `• PWD Delhi Chief Engineer & Municipal Corporation Works Division`,
            action: `• Completed pothole filling on ${solved} locations.`,
            pending: `• Financial allocation for secondary road hot-mix overlays.`
        },
        "Electricity": {
            what: `• Substation load anomalies and wire sag reports total ${total} complaints (${active} active).\n• Evening peak load exceeded transformer capacity by 12%.`,
            where: `• Central District Chandni Chowk (7 cases) & South District Neb Sarai (4 cases).`,
            who: `• BSES Yamuna & BSES Rajdhani Distribution Executives`,
            action: `• Rerouted supply lines at ${solved} stations.\n• Bundled sagging overhead cables.`,
            pending: `• Municipal space allocation for transformer pods.`
        },
        "All": {
            what: `• Civic hotline registered ${total} reports (${active} active).\n• Sanitation (${sanitation} complaints) & Water Supply (${water} complaints) form 60% of workload.`,
            where: `• Central Delhi (46 cases) & South Delhi (26 cases).`,
            who: `• Joint Municipal Commissioner & Departmental Nodal Officers`,
            action: `• Resolved ${solved} reports across NCT.\n• Deployed waste clearance & water repair crews.`,
            pending: `• Digging coordination permits and road cutting NOCs from Traffic Police.`
        }
    };

    return categoryReports[category] || categoryReports["All"];
};

export const getDistrictFromEmail = (email) => {
    if (!email) return null;
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes("north_west")) return "North West";
    if (lowerEmail.includes("north_east")) return "North East";
    if (lowerEmail.includes("new_delhi")) return "New Delhi";
    if (lowerEmail.includes("south_west")) return "South West";
    if (lowerEmail.includes("south_east")) return "South East";
    if (lowerEmail.includes("north")) return "North";
    if (lowerEmail.includes("shahdara")) return "Shahdara";
    if (lowerEmail.includes("east")) return "East";
    if (lowerEmail.includes("west")) return "West";
    if (lowerEmail.includes("central")) return "Central";
    if (lowerEmail.includes("south")) return "South";
    return null;
};
