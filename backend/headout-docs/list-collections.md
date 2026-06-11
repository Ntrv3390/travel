> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# List all collections

Retrieve curated collections of experiences for a specific city (e.g., "Broadway Shows", "Statue of Liberty Tours", "Theme Parks"). Collections group related products together and are ideal for showcasing themed experiences or popular attractions to users. Results are ordered by city-specific collection rank. Use the returned IDs as `collectionId` in the [Products endpoint](/api-partner/v2/products).

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/collections/?cityCode=<CITY_CODE>&languageCode=<LANGUAGE_CODE>&limit=<LIMIT>&offset=<OFFSET>' \
  --header 'Headout-Auth: <YOUR_API_KEY>'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "collections": [
      {
        "id": "4012",
        "name": "Edge NYC",
        "content": {
          "description": null,
          "subtext": "Discover the city that never sleeps from a whole new perspective with our NYC Edge collection. From the 100th floor of 30 Hudson Yards, you'll be treated to stunning panoramic views of Manhattan and beyond. Step onto the glass floor and feel the exhilarating sensation of floating above the city streets, and go for the City Climb experience for a heart-pounding experience."
        },
        "cityCode": "NEW_YORK",
        "localeSpecificUrls": {
          "EN": "/edge-observation-deck-tickets-c-4012/",
          "ES": "/es/edge-nyc-c-4012/",
          "FR": "/fr/edge-nyc-c-4012/",
          "IT": "/it/edge-nyc-c-4012/",
          "DE": "/de/rand-nyc-c-4012/",
          "PT": "/pt/borda-nyc-c-4012/",
          "NL": "/nl/rand-nyc-c-4012/",
          "PL": "/pl/edge-observation-deck-tickets-c-4012/",
          "KO": "/ko/edge-observation-deck-tickets-c-4012/",
          "JA": "/ja/edge-observation-deck-tickets-c-4012/",
          "ZH_HANS": "/zh-hans/edge-observation-deck-tickets-c-4012/",
          "DA": "/da/edge-nyc-c-4012/",
          "NO": "/no/edge-nyc-c-4012/",
          "RO": "/ro/edge-nyc-c-4012/",
          "RU": "/ru/edge-observation-deck-tickets-c-4012/",
          "SV": "/sv/edge-nyc-c-4012/",
          "TR": "/tr/edge-observation-deck-tickets-c-4012/"
        },
        "canonicalUrl": "https://www.headout.com/edge-observation-deck-tickets-c-4012/",
        "heroImage": {
          "url": "https://cdn-imgix.headout.com/media/images/3fb40eb93c5f4c49d81e2e1994a9ce40-3fb40eb93c5f4c49d81e2e1994a9ce40-Edge%20Nyc.jpg",
          "type": "IMAGE"
        },
        "cardImage": {
          "url": "https://cdn-imgix.headout.com/media/images/3a08d0636f67ba3bce595cd4b0d82d9b-4012-new-york-the-edge-02.jpg",
          "type": "IMAGE"
        }
      }
    ],
    "nextUrl": "/api/public/v2/collections?cityCode=NEW_YORK&languageCode=en&offset=1&limit=1",
    "prevUrl": null,
    "total": 58,
    "nextOffset": 1
  }
  ```
</ResponseExample>


## OpenAPI

````yaml GET /api/public/v2/collections/
openapi: 3.1.0
info:
  title: Headout API Docs - Common v2
  version: 0.0.1
servers:
  - url: https://www.headout.com
    description: Production server
  - url: https://www.sandbox-headout.com
    description: Sandbox server
security: []
paths:
  /api/public/v2/collections/:
    get:
      tags:
        - Collections
      summary: List all collections
      operationId: v2ListCollections
      parameters:
        - $ref: '#/components/parameters/cityCode'
        - $ref: '#/components/parameters/languageCode'
        - $ref: '#/components/parameters/offset'
        - $ref: '#/components/parameters/limit'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2Collections'
      security:
        - apiKeyAuth: []
components:
  parameters:
    cityCode:
      name: cityCode
      in: query
      required: true
      schema:
        type: string
      description: >-
        Uppercase city identifier (e.g., `NEW_YORK`, `DUBAI`, `LONDON`).
        Available city codes are returned by the Cities endpoint.
    languageCode:
      name: languageCode
      in: query
      schema:
        type: string
        default: EN
        enum:
          - EN
          - ES
          - FR
          - IT
          - DE
          - PT
          - NL
          - PL
          - KO
          - JA
          - ZH_HANS
          - ZH_HANT
          - AR
          - DA
          - false
          - RO
          - RU
          - SV
          - TR
      description: >-
        Language code for localizing response content including product names,
        descriptions, and URLs. Defaults to English (`EN`). Content falls back
        to English when a translation is unavailable. See [supported language
        codes](/guide/enums-and-error-codes#language-codes).
    offset:
      name: offset
      in: query
      schema:
        type: integer
        default: 0
      description: >-
        Number of records to skip for pagination. Use with `limit` to paginate
        through large result sets. Start at `0` for the first page.
    limit:
      name: limit
      in: query
      schema:
        type: integer
        default: 10
      description: >-
        Maximum number of records to return per request. Use with `offset` to
        paginate through results. Check `nextOffset` in response for more pages.
  schemas:
    V2Collections:
      type: object
      properties:
        collections:
          type: array
          items:
            $ref: '#/components/schemas/V2Collection'
          description: The collections in this page of results.
        nextUrl:
          type:
            - string
            - 'null'
          description: >-
            Full URL to fetch the next page of results. Null if on the last
            page.
        prevUrl:
          type:
            - string
            - 'null'
          description: >-
            Full URL to fetch the previous page of results. Null if on the first
            page.
        total:
          type: integer
          description: >-
            Total number of collections available in the requested city across
            all pages.
        nextOffset:
          type:
            - integer
            - 'null'
          description: >-
            Offset value to use in the next request to retrieve the following
            page.
    V2Collection:
      type: object
      properties:
        id:
          type: string
          description: >-
            Headout's identifier for this collection. Use as the `collectionId`
            filter in the Products endpoint.
        name:
          type: string
          description: >-
            Display name of the collection (e.g., "Broadway Shows", "Statue of
            Liberty").
        cityCode:
          type: string
          description: The city this collection belongs to (e.g., `NEW_YORK`, `LONDON`).
        content:
          type:
            - object
            - 'null'
          description: Editorial content for this collection.
          properties:
            description:
              type:
                - string
                - 'null'
              description: Long-form description of the collection.
            subtext:
              type:
                - string
                - 'null'
              description: Short subtext or tagline for the collection.
        localeSpecificUrls:
          type: object
          additionalProperties:
            type: string
          description: >-
            Localized collection page URLs keyed by language code (`EN`, `ES`,
            `FR`, etc.).
        canonicalUrl:
          type: string
          description: >-
            The canonical Headout URL for this collection page, suitable for
            linking and SEO.
        heroImage:
          type:
            - object
            - 'null'
          description: Hero/banner image for the collection.
          properties:
            url:
              type: string
              description: CDN URL for the image.
            type:
              type: string
              description: Media type (e.g., `IMAGE`).
        cardImage:
          type:
            - object
            - 'null'
          description: Card/thumbnail image for the collection.
          properties:
            url:
              type: string
              description: CDN URL for the image.
            type:
              type: string
              description: Media type (e.g., `IMAGE`).
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````