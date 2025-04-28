// favicon.js
    (function () {
      const canvas_favicon = document.createElement('canvas');
      canvas_favicon.width = 1;
      canvas_favicon.height = 1;

      const canvas_favicon_ctx = canvas_favicon.getContext('2d');
      canvas_favicon_ctx.fillStyle = '#0000FF'; // niebieski
      canvas_favicon_ctx.fillRect(0, 0, 1, 1);

      const faviconURL = canvas_favicon.toDataURL('image/x-icon');

      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconURL;

      document.head.appendChild(link);
    })();