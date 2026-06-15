> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Venue Map

For products with `inventorySelectionType: SEATMAP`. Returns a CDN URL for the venue layout SVG. Use this to render the physical layout of the venue when building a custom seat selection UI.

The SVG is static per product — it does not change per show or date. Call this once per product and cache the result.

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "productId": 3023,
    "svgUrl": "https://cdn.headout.com/seatmap/3314/venue-layout.svg"
  }
  ```
</ResponseExample>


## OpenAPI

````yaml GET /api/public/v2/products/{productId}/svg/
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
  /api/public/v2/products/{productId}/svg/:
    get:
      tags:
        - Seatmap
      summary: Venue map
      operationId: getSeatmapSvg
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: integer
          description: Product identifier
      responses:
        '200':
          description: SVG URL for the venue layout
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SeatmapSvgResponse'
        '403':
          description: Partner not authorised, or partner type is Affiliate
        '404':
          description: No SVG available for this product
      security:
        - apiKeyAuth: []
components:
  schemas:
    SeatmapSvgResponse:
      type: object
      properties:
        productId:
          type: integer
        svgUrl:
          type: string
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````