> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# List all categories

Retrieve a list of all top-level experience categories (Tickets, Tours, Transportation, etc.) available in a specific city. Categories help organize products by experience type and are useful for building navigation menus or filtering product catalogs. Results are ordered by category rank. Use the returned IDs as `categoryId` in the [Products endpoint](/api-partner/v2/products).

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/categories/?cityCode=<CITY_CODE>&languageCode=<LANGUAGE_CODE>' \
  --header 'Headout-Auth: <YOUR_API_KEY>'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "categories": [
      {
        "id": "1",
        "name": "Tickets",
        "localeSpecificUrls": {
          "EN": "/tickets-new_york-ca-1~21553/",
          "ES": "/es/entradas-new_york-ca-1~21553/",
          "FR": "/fr/billets-new_york-ca-1~21553/",
          "IT": "/it/biglietti-new_york-ca-1~21553/",
          "DE": "/de/tickets-new_york-ca-1~21553/",
          "PT": "/pt/ingressos-new_york-ca-1~21553/",
          "NL": "/nl/tickets-new_york-ca-1~21553/"
        },
        "canonicalUrl": "https://www.headout.com/tickets-new_york-ca-1~21553/"
      },
      {
        "id": "2",
        "name": "Tours",
        "localeSpecificUrls": {
          "EN": "/tours-new_york-ca-2~21553/",
          "ES": "/es/tours-new_york-ca-2~21553/",
          "FR": "/fr/visites-new_york-ca-2~21553/",
          "IT": "/it/tour-new_york-ca-2~21553/",
          "DE": "/de/touren-new_york-ca-2~21553/",
          "PT": "/pt/tours-new_york-ca-2~21553/",
          "NL": "/nl/tours-new_york-ca-2~21553/"
        },
        "canonicalUrl": "https://www.headout.com/tours-new_york-ca-2~21553/"
      }
    ]
  }
  ```
</ResponseExample>


## OpenAPI

````yaml GET /api/public/v2/categories/
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
  /api/public/v2/categories/:
    get:
      tags:
        - Categories
      summary: List all categories
      operationId: v2ListCategories
      parameters:
        - $ref: '#/components/parameters/cityCode'
        - $ref: '#/components/parameters/languageCode'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2Categories'
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
  schemas:
    V2Categories:
      type: object
      properties:
        categories:
          type: array
          items:
            $ref: '#/components/schemas/V2Category'
          description: All top-level experience categories available in the requested city.
    V2Category:
      type: object
      properties:
        id:
          type: string
          description: >-
            Headout's identifier for this category. Use as the `categoryId`
            filter in the Products endpoint.
        name:
          type: string
          description: >-
            Display name of the category (e.g., "Tickets", "Tours",
            "Transportation").
        localeSpecificUrls:
          type: object
          additionalProperties:
            type: string
          description: >-
            Localized category page URLs keyed by language code (`EN`, `ES`,
            `FR`, etc.).
        canonicalUrl:
          type: string
          description: >-
            The canonical Headout URL for this category page, suitable for
            linking and SEO.
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````