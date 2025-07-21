import type { Schema, Struct } from '@strapi/strapi';

export interface VariantProductVariantProduct extends Struct.ComponentSchema {
  collectionName: 'components_variant_product_variant_products';
  info: {
    description: '';
    displayName: 'variant-product';
  };
  attributes: {
    image: Schema.Attribute.Media<'images' | 'files'>;
    name: Schema.Attribute.String;
    price: Schema.Attribute.Integer;
    purchase_deadline: Schema.Attribute.Date;
    quota: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'variant-product.variant-product': VariantProductVariantProduct;
    }
  }
}
