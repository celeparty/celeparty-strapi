import type { Schema, Struct } from '@strapi/strapi';

export interface VariantProductVariantProduct extends Struct.ComponentSchema {
  collectionName: 'components_variant_product_variant_products';
  info: {
    description: '';
    displayName: 'variant-product';
  };
  attributes: {
    image: Schema.Attribute.Media<'images' | 'files'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    price: Schema.Attribute.Integer & Schema.Attribute.Required;
    purchase_deadline: Schema.Attribute.Date & Schema.Attribute.Required;
    quota: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'variant-product.variant-product': VariantProductVariantProduct;
    }
  }
}
