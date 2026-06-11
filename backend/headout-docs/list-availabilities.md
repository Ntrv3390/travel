> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# List availabilities - Normal

> For products with `inventorySelectionType: NORMAL`. Retrieve date-level availability for a specific variant within a date range, with pricing from the lowest-priced slot per date.

Retrieve date-level availability for a specific variant of a normal product within a date range.

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/products/2920/variants/4782/availabilities/?currencyCode=USD&startDate=2026-07-01&endDate=2026-07-31' \
  --header 'Headout-Auth: <YOUR_API_KEY>'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "productId": 2920,
    "variantId": 4782,
    "currencyCode": "USD",
    "availabilities": [
      {
        "date": "2026-07-14",
        "pricing": {
          "currency": "USD",
          "profileType": "PER_PERSON",
          "headoutSellingPrice": 220.33,
          "netPrice": 176.27
        },
        "availability": "LIMITED",
        "remaining": 5
      }
    ]
  }
  ```
</ResponseExample>


## OpenAPI

````yaml specs/openapi-v2-api-partner.yaml GET /api/public/v2/products/{productId}/variants/{variantId}/availabilities/
openapi: 3.1.0
info:
  title: Headout API Docs - API Partner v2
  version: 0.0.1
servers:
  - url: https://www.headout.com
    description: Production server
  - url: https://www.sandbox-headout.com
    description: Sandbox server
security: []
paths:
  /api/public/v2/products/{productId}/variants/{variantId}/availabilities/:
    get:
      tags:
        - Availabilities
      summary: List availabilities - Normal
      description: >-
        For products with `inventorySelectionType: NORMAL`. Retrieve date-level
        availability for a specific variant within a date range, with pricing
        from the lowest-priced slot per date.
      operationId: v2ListNormalProductAvailabilities
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: integer
          description: Normal product ID.
        - name: variantId
          in: path
          required: true
          schema:
            type: integer
          description: Variant ID belonging to the product.
        - name: currencyCode
          in: query
          required: false
          schema:
            type: string
          description: Currency code for displaying prices. Defaults to `USD` when omitted.
        - name: startDate
          in: query
          required: false
          schema:
            type: string
            format: date
          description: >-
            Beginning of the availability window in `yyyy-MM-dd` format.
            Defaults to today in the tour city timezone.
        - name: endDate
          in: query
          required: false
          schema:
            type: string
            format: date
          description: >-
            End of the availability window in `yyyy-MM-dd` format. Defaults to
            `startDate + 60 days`. The date range cannot exceed 90 days
            inclusive.
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2NormalAvailabilityResponse'
        '400':
          description: >-
            Bad request due to missing or invalid query parameters, or when the
            date range exceeds 90 days inclusive.
        '403':
          description: Distribution partner profile is required.
        '404':
          description: >-
            Product not found, not a normal product, or variantId does not
            belong to the product.
        '500':
          description: Unexpected error while processing the request.
      security:
        - apiKeyAuth: []
      x-codeSamples:
        - lang: curl
          source: >
            curl --location
            'https://www.headout.com/api/public/v2/products/1234/variants/5678/availabilities/?currencyCode=USD&startDate=2026-06-01&endDate=2026-06-30'
            \

            --header 'Headout-Auth: <YOUR_API_KEY>'
components:
  schemas:
    V2NormalAvailabilityResponse:
      type: object
      properties:
        productId:
          type: integer
          description: Product ID from the path parameter.
        variantId:
          type: integer
          description: Variant ID from the path parameter.
        currencyCode:
          type: string
          description: Resolved currency code used in this response.
        availabilities:
          type: array
          description: >-
            Date-level availability sorted ascending by date. Empty when no
            availability exists for the requested window.
          items:
            $ref: '#/components/schemas/V2NormalAvailability'
    V2NormalAvailability:
      type: object
      properties:
        date:
          type: string
          format: date
          description: Availability date in `yyyy-MM-dd` format.
        pricing:
          description: Partner pricing for the lowest-priced slot on this date.
          allOf:
            - $ref: '#/components/schemas/V2NormalPricing'
        availability:
          type: string
          enum:
            - UNLIMITED
            - LIMITED
            - CLOSED
          description: Aggregated availability status across all slots for the date.
        remaining:
          type: integer
          description: >-
            Total remaining inventory across all slots. Returns `1000` when
            availability is `UNLIMITED`.
    V2NormalPricing:
      allOf:
        - $ref: '#/components/schemas/V2NormalPricingApiPartner'
      description: >-
        Pricing information for API Partner accounts. Includes `netPrice` and
        `headoutSellingPrice`.
    V2NormalPricingApiPartner:
      title: API Partner Pricing
      allOf:
        - $ref: '#/components/schemas/V2NormalPricingBase'
        - type: object
          properties:
            netPrice:
              type: number
              format: double
              description: Partner net price for the lowest-priced slot on this date.
    V2NormalPricingBase:
      type: object
      properties:
        currency:
          type: string
          description: >-
            Currency code (e.g., USD, EUR). Defaults to USD if `currencyCode` is
            not provided in the request. See [Currency
            Codes](/guide/enums-and-error-codes#currency-codes).
        profileType:
          type: string
          enum:
            - PER_PERSON
          description: Price profile type.
        headoutSellingPrice:
          type: number
          format: double
          description: Headout selling price for the lowest-priced slot on this date.
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````