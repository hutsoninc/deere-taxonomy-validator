const fetch = require('fetch-retry');
const { xmlToJson } = require('@hutsoninc/utils');

async function fetchTaxonomy(options) {
    let data = await fetch(options.taxonomyUrl, {
        method: 'GET',
        headers: options.headers,
    });
    data = await data.text();
    data = await xmlToJson(data);
    data = JSON.parse(data);
    return data;
}

module.exports = fetchTaxonomy;
