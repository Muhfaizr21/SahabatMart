import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Komponen SEO Utama SahabatMart (AkuGlow)
 * Mengelola metadata, social tags, canonical URL, dan schema data terstruktur.
 */
const SEO = ({ 
  title, 
  description, 
  name = "SahabatMart", 
  type = "website", 
  image = "/akuglow.jpg", 
  url = window.location.href,
  schema = null,
  noindex = false
}) => {
  const fullTitle = title ? `${title} | ${name}` : name;
  const siteUrl = window.location.origin;
  const ogImage = image.startsWith('http') ? image : `${siteUrl}${image}`;

  return (
    <Helmet>
      {/* Dasar SEO */}
      <html lang="id" />
      <title>{fullTitle}</title>
      <meta name='description' content={description} />
      <link rel="canonical" href={url} />
      
      {/* Indexing Control */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content={name} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="id_ID" />
      
      {/* Twitter */}
      <meta name="twitter:card" content={type === 'article' ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@akuglow" />
      <meta name="twitter:creator" content="@akuglow" />

      {/* Schema / Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
