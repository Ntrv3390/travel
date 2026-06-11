> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# List all cities

Returns a paginated list of discoverable cities on Headout. Each city includes a code (used as `cityCode` in other endpoints), a display name, an image, the country it belongs to, and its IANA timezone. Results are sorted alphabetically by city name. Use the `cityCode` to filter the [Products endpoint](/api-partner/v2/products).

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/cities/' \
  --header 'Headout-Auth: <YOUR_API_KEY>'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "cities": [
      {
        "code": "AMSTERDAM",
        "name": "Amsterdam",
        "image": {
          "url": "//cdn-imgix.headout.com/media/images/ee075882083344be170ed38c8c76b4a1-amsterdam.jpeg"
        },
        "country": {
          "code": "NL",
          "name": "Netherlands"
        },
        "timezone": "Europe/Amsterdam"
      },
      {
        "code": "BARCELONA",
        "name": "Barcelona",
        "image": {
          "url": "//cdn-imgix.headout.com/media/images/4b075882083344be170ed38c8c76b4a1-barcelona.jpeg"
        },
        "country": {
          "code": "ES",
          "name": "Spain"
        },
        "timezone": "Europe/Madrid"
      },
      {
        "code": "BERLIN",
        "name": "Berlin",
        "image": {
          "url": "//cdn-imgix.headout.com/media/images/2a075882083344be170ed38c8c76b4a1-berlin.jpeg"
        },
        "country": {
          "code": "DE",
          "name": "Germany"
        },
        "timezone": "Europe/Berlin"
      }
    ],
    "nextUrl": "/api/public/v2/cities/?offset=20&limit=20",
    "prevUrl": null,
    "total": 142,
    "nextOffset": 20
  }
  ```
</ResponseExample>


## OpenAPI

````yaml GET /api/public/v2/cities/
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
  /api/public/v2/cities/:
    get:
      tags:
        - Cities
      summary: List all cities
      operationId: v2ListCities
      parameters:
        - name: offset
          in: query
          required: false
          schema:
            type: integer
            default: 0
          description: >-
            Number of cities to skip. Defaults to `0`. Increment by the `limit`
            value (default `20`) to fetch subsequent pages.
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 20
            maximum: 20
          description: >-
            Maximum number of cities per page. Defaults to `20`. Values above
            `20` are capped to `20`.
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2PaginatedCities'
        '400':
          description: Bad request - offset cannot be negative
      security:
        - apiKeyAuth: []
components:
  schemas:
    V2PaginatedCities:
      type: object
      properties:
        cities:
          type: array
          items:
            $ref: '#/components/schemas/V2City'
          description: The cities in this page of results.
        nextUrl:
          type:
            - string
            - 'null'
          description: >-
            Relative URL to fetch the next page of results. Null if on the last
            page.
        prevUrl:
          type:
            - string
            - 'null'
          description: >-
            Relative URL to fetch the previous page of results. Null if on the
            first page.
        total:
          type: integer
          description: Total number of discoverable cities across all pages.
        nextOffset:
          type:
            - integer
            - 'null'
          description: Offset value for the next page. Null if on the last page.
    V2City:
      type: object
      properties:
        code:
          type: string
          description: >-
            City code (e.g., `NEW_YORK`, `DUBAI`, `LONDON`). Use this as the
            `cityCode` parameter in other endpoints.
        name:
          type: string
          description: Display name of the city (e.g., "New York", "Dubai", "London").
        image:
          $ref: '#/components/schemas/Image'
          description: City image suitable for navigation or city selection UI.
        country:
          $ref: '#/components/schemas/V2Country'
          description: Country in which the city is located.
        timezone:
          type: string
          description: >-
            IANA timezone identifier for the city (e.g., `America/New_York`,
            `Asia/Dubai`, `Europe/London`).
    Image:
      type: object
      properties:
        url:
          type: string
          description: >-
            CDN URL for the image. Can be used with imgix parameters for
            resizing and format conversion.
    V2Country:
      type: object
      properties:
        code:
          type: string
          description: ISO 3166-1 alpha-2 country code (e.g., `US`, `AE`, `GB`).
        name:
          type: string
          description: >-
            English display name of the country (e.g., "United States", "United
            Arab Emirates", "United Kingdom").
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````