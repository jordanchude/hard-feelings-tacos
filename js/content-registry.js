(function (global) {
  const allowedModes = new Set(['text', 'paragraphs', 'placeholder', 'value']);
  const allowedPages = new Set(['Homepage', 'About', 'Shared']);
  const metadataRoles = {
    home_hero_heading: 'title',
    home_hero_intro: 'description',
    about_heading: 'title',
    about_intro: 'description'
  };
  const registry = [
    { key: 'shared_promo_cta', page: 'Shared', section: 'promo modal', label: 'Promo button label', mode: 'text', help: 'Button in the promotional image modal on both pages; destination stays fixed.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_promo_cta"]' },
    { key: 'shared_notice_heading', page: 'Shared', section: 'snow notice', label: 'Notice heading', mode: 'text', help: 'Heading in the legacy notice modal on both pages.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_notice_heading"]' },
    { key: 'shared_notice_body', page: 'Shared', section: 'snow notice', label: 'Notice message', mode: 'paragraphs', help: 'Message in the legacy notice modal on both pages.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_notice_body"]' },
    { key: 'shared_nav_home_label', page: 'Shared', section: 'top navigation', label: 'Home link label', mode: 'text', help: 'Home link in the top navigation on both pages.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_nav_home_label"]' },
    { key: 'shared_nav_popups_label', page: 'Shared', section: 'top navigation', label: 'Pop-Ups link label', mode: 'text', help: 'Pop-Ups link in the top navigation on both pages.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_nav_popups_label"]' },
    { key: 'shared_nav_about_label', page: 'Shared', section: 'top navigation', label: 'About link label', mode: 'text', help: 'About link in the top navigation on both pages.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_nav_about_label"]' },
    { key: 'home_hero_heading', page: 'Homepage', section: 'hero', label: 'Hero heading', mode: 'text', help: 'Main large heading at the top of the homepage.', viewUrl: '/index.html', selector: '[data-site-content-key="home_hero_heading"]', metadataRole: 'title' },
    { key: 'home_hero_subtitle', page: 'Homepage', section: 'hero', label: 'Hero subtitle', mode: 'text', help: 'Parenthetical line beneath the hero heading.', viewUrl: '/index.html', selector: '[data-site-content-key="home_hero_subtitle"]' },
    { key: 'home_hero_intro', page: 'Homepage', section: 'hero', label: 'Hero introduction', mode: 'paragraphs', help: 'Main descriptive paragraph beside the hero image.', viewUrl: '/index.html', selector: '[data-site-content-key="home_hero_intro"]', metadataRole: 'description' },
    { key: 'home_hero_cta', page: 'Homepage', section: 'hero', label: 'Hero button label', mode: 'text', help: 'Button that scrolls to Pop-Ups; destination stays fixed.', viewUrl: '/index.html', selector: '[data-site-content-key="home_hero_cta"]' },
    { key: 'home_marquee_chorizo', page: 'Homepage', section: 'menu marquee', label: 'Chorizo word', mode: 'text', help: 'First word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_chorizo"]' },
    { key: 'home_marquee_huevos', page: 'Homepage', section: 'menu marquee', label: 'Huevos word', mode: 'text', help: 'Second word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_huevos"]' },
    { key: 'home_marquee_papas', page: 'Homepage', section: 'menu marquee', label: 'Papas word', mode: 'text', help: 'Third word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_papas"]' },
    { key: 'home_marquee_frijoles', page: 'Homepage', section: 'menu marquee', label: 'Frijoles word', mode: 'text', help: 'Fourth word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_frijoles"]' },
    { key: 'home_marquee_tortillas', page: 'Homepage', section: 'menu marquee', label: 'Tortillas word', mode: 'text', help: 'Fifth word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_tortillas"]' },
    { key: 'home_marquee_queso', page: 'Homepage', section: 'menu marquee', label: 'Queso word', mode: 'text', help: 'Sixth word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_queso"]' },
    { key: 'home_marquee_salsa', page: 'Homepage', section: 'menu marquee', label: 'Salsa word', mode: 'text', help: 'Seventh word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_salsa"]' },
    { key: 'home_marquee_cebollas', page: 'Homepage', section: 'menu marquee', label: 'Cebollas word', mode: 'text', help: 'Eighth word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_cebollas"]' },
    { key: 'home_marquee_jalapenos', page: 'Homepage', section: 'menu marquee', label: 'Jalapeños word', mode: 'text', help: 'Ninth word in the scrolling ingredient strip.', viewUrl: '/index.html', selector: '[data-site-content-key="home_marquee_jalapenos"]' },
    { key: 'home_menu_image_caption', page: 'Homepage', section: 'menu', label: 'Menu image caption', mode: 'text', help: 'Caption displayed over the menu-slider image.', viewUrl: '/index.html', selector: '[data-site-content-key="home_menu_image_caption"]' },
    { key: 'home_menu_chorizo_title', page: 'Homepage', section: 'menu', label: 'Chorizo taco name', mode: 'text', help: 'First menu-slider item title.', viewUrl: '/index.html', selector: '[data-site-content-key="home_menu_chorizo_title"]' },
    { key: 'home_menu_chorizo_description', page: 'Homepage', section: 'menu', label: 'Chorizo taco description', mode: 'paragraphs', help: 'First menu-slider item description.', viewUrl: '/index.html', selector: '[data-site-content-key="home_menu_chorizo_description"]' },
    { key: 'home_menu_papas_title', page: 'Homepage', section: 'menu', label: 'Papas taco name', mode: 'text', help: 'Second menu-slider item title.', viewUrl: '/index.html', selector: '[data-site-content-key="home_menu_papas_title"]' },
    { key: 'home_menu_papas_description', page: 'Homepage', section: 'menu', label: 'Papas taco description', mode: 'paragraphs', help: 'Second menu-slider item description.', viewUrl: '/index.html', selector: '[data-site-content-key="home_menu_papas_description"]' },
    { key: 'home_menu_vegan_title', page: 'Homepage', section: 'menu', label: 'Vegan taco name', mode: 'text', help: 'Third menu-slider item title.', viewUrl: '/index.html', selector: '[data-site-content-key="home_menu_vegan_title"]' },
    { key: 'home_menu_vegan_description', page: 'Homepage', section: 'menu', label: 'Vegan taco description', mode: 'paragraphs', help: 'Third menu-slider item description.', viewUrl: '/index.html', selector: '[data-site-content-key="home_menu_vegan_description"]' },
    { key: 'home_values_heading', page: 'Homepage', section: 'values', label: 'Values heading', mode: 'text', help: 'Heading over the values panel.', viewUrl: '/index.html', selector: '[data-site-content-key="home_values_heading"]' },
    { key: 'home_values_body', page: 'Homepage', section: 'values', label: 'Values description', mode: 'paragraphs', help: 'Values panel copy shown in desktop/mobile layout.', viewUrl: '/index.html', selector: '[data-site-content-key="home_values_body"]' },
    { key: 'home_values_cta', page: 'Homepage', section: 'values', label: 'Values button label', mode: 'text', help: 'Values-panel CTA label; existing destination remains unchanged.', viewUrl: '/index.html', selector: '[data-site-content-key="home_values_cta"]' },
    { key: 'home_popups_heading', page: 'Homepage', section: 'pop-ups', label: 'Pop-Ups heading', mode: 'text', help: 'Heading above the event tabs.', viewUrl: '/index.html', selector: '[data-site-content-key="home_popups_heading"]' },
    { key: 'home_popups_upcoming_label', page: 'Homepage', section: 'pop-ups', label: 'Upcoming tab label', mode: 'text', help: 'Upcoming-events tab; filtering behavior stays fixed.', viewUrl: '/index.html', selector: '[data-site-content-key="home_popups_upcoming_label"]' },
    { key: 'home_popups_past_label', page: 'Homepage', section: 'pop-ups', label: 'Past tab label', mode: 'text', help: 'Past-events tab; filtering behavior stays fixed.', viewUrl: '/index.html', selector: '[data-site-content-key="home_popups_past_label"]' },
    { key: 'home_host_heading', page: 'Homepage', section: 'host', label: 'Host a pop-up heading', mode: 'text', help: 'Heading above the host-request form.', viewUrl: '/index.html', selector: '[data-site-content-key="home_host_heading"]' },
    { key: 'home_host_body', page: 'Homepage', section: 'host', label: 'Host a pop-up description', mode: 'paragraphs', help: 'Intro copy next to the host-request form.', viewUrl: '/index.html', selector: '[data-site-content-key="home_host_body"]' },
    { key: 'home_host_name_placeholder', page: 'Homepage', section: 'host', label: 'Name-field prompt', mode: 'placeholder', help: 'Placeholder inside the host-request name field.', viewUrl: '/index.html', selector: '[data-site-content-key="home_host_name_placeholder"]' },
    { key: 'home_host_email_placeholder', page: 'Homepage', section: 'host', label: 'Email-field prompt', mode: 'placeholder', help: 'Placeholder inside the host-request email field.', viewUrl: '/index.html', selector: '[data-site-content-key="home_host_email_placeholder"]' },
    { key: 'home_host_details_placeholder', page: 'Homepage', section: 'host', label: 'Event-details prompt', mode: 'placeholder', help: 'Instructions inside the host-request details field.', viewUrl: '/index.html', selector: '[data-site-content-key="home_host_details_placeholder"]' },
    { key: 'home_host_submit_label', page: 'Homepage', section: 'host', label: 'Host request button label', mode: 'value', help: 'Submit-button label; submission workflow stays fixed.', viewUrl: '/index.html', selector: '[data-site-content-key="home_host_submit_label"]' },
    { key: 'about_heading', page: 'About', section: 'story', label: 'About heading', mode: 'text', help: 'Main About page heading.', viewUrl: '/about-us.html', selector: '[data-site-content-key="about_heading"]', metadataRole: 'title' },
    { key: 'about_intro', page: 'About', section: 'story', label: 'About introduction', mode: 'paragraphs', help: "First paragraph beside Rebecca's image.", viewUrl: '/about-us.html', selector: '[data-site-content-key="about_intro"]', metadataRole: 'description' },
    { key: 'about_bio', page: 'About', section: 'story', label: 'About bio', mode: 'paragraphs', help: 'Existing editable second/long-form About paragraph.', viewUrl: '/about-us.html', selector: '[data-site-content-key="about_bio"]' },
    { key: 'about_follow_heading', page: 'About', section: 'follow Rebecca', label: 'Follow Rebecca heading', mode: 'text', help: 'Heading above social links.', viewUrl: '/about-us.html', selector: '[data-site-content-key="about_follow_heading"]' },
    { key: 'about_follow_body', page: 'About', section: 'follow Rebecca', label: 'Follow Rebecca description', mode: 'paragraphs', help: 'Description above Substack and Instagram links.', viewUrl: '/about-us.html', selector: '[data-site-content-key="about_follow_body"]' },
    { key: 'about_follow_substack_label', page: 'About', section: 'follow Rebecca', label: 'Substack link label', mode: 'text', help: 'Visible label for the fixed Substack link.', viewUrl: '/about-us.html', selector: '[data-site-content-key="about_follow_substack_label"]' },
    { key: 'about_follow_instagram_label', page: 'About', section: 'follow Rebecca', label: 'Instagram link label', mode: 'text', help: 'Visible label for the fixed Instagram link.', viewUrl: '/about-us.html', selector: '[data-site-content-key="about_follow_instagram_label"]' },
    { key: 'shared_banner_badge', page: 'Shared', section: 'anniversary banner', label: 'Banner badge', mode: 'text', help: 'Short badge at the left of the anniversary banner.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_banner_badge"], [data-site-content-key="shared_banner_badge"]' },
    { key: 'shared_banner_message', page: 'Shared', section: 'anniversary banner', label: 'Banner message', mode: 'text', help: 'Main anniversary-banner copy; event date/countdown code stays fixed.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_banner_message"]' },
    { key: 'shared_footer_contact_heading', page: 'Shared', section: 'footer', label: 'Contact column heading', mode: 'text', help: 'Footer heading on both pages.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_contact_heading"]' },
    { key: 'shared_footer_email_label', page: 'Shared', section: 'footer', label: 'Email link label', mode: 'text', help: 'Visible label for the fixed mailto link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_email_label"]' },
    { key: 'shared_footer_email_action', page: 'Shared', section: 'footer', label: 'Email action word', mode: 'text', help: 'Small action word beside the Email link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_email_action"]' },
    { key: 'shared_footer_host_label', page: 'Shared', section: 'footer', label: 'Host link label', mode: 'text', help: 'Visible label for the fixed host link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_host_label"]' },
    { key: 'shared_footer_host_action', page: 'Shared', section: 'footer', label: 'Host action word', mode: 'text', help: 'Small action word beside the Host link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_host_action"]' },
    { key: 'shared_footer_instagram_label', page: 'Shared', section: 'footer', label: 'Instagram link label', mode: 'text', help: 'Visible label for the fixed Instagram link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_instagram_label"]' },
    { key: 'shared_footer_instagram_action', page: 'Shared', section: 'footer', label: 'Instagram action word', mode: 'text', help: 'Small action word beside the Instagram link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_instagram_action"]' },
    { key: 'shared_footer_navigation_heading', page: 'Shared', section: 'footer', label: 'Navigation column heading', mode: 'text', help: 'Footer navigation heading on both pages.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_navigation_heading"]' },
    { key: 'shared_footer_home_label', page: 'Shared', section: 'footer', label: 'Home link label', mode: 'text', help: 'Visible label for the fixed home link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_home_label"]' },
    { key: 'shared_footer_home_action', page: 'Shared', section: 'footer', label: 'Home action word', mode: 'text', help: 'Small action word beside the Home link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_home_action"]' },
    { key: 'shared_footer_popups_label', page: 'Shared', section: 'footer', label: 'Pop-Ups link label', mode: 'text', help: 'Visible label for the fixed pop-ups link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_popups_label"]' },
    { key: 'shared_footer_popups_action', page: 'Shared', section: 'footer', label: 'Pop-Ups action word', mode: 'text', help: 'Small action word beside the Pop-Ups link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_popups_action"]' },
    { key: 'shared_footer_about_label', page: 'Shared', section: 'footer', label: 'About link label', mode: 'text', help: 'Visible label for the fixed About link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_about_label"]' },
    { key: 'shared_footer_about_action', page: 'Shared', section: 'footer', label: 'About action word', mode: 'text', help: 'Small action word beside the About link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_about_action"]' },
    { key: 'shared_footer_substack_prompt', page: 'Shared', section: 'footer', label: 'Substack prompt', mode: 'paragraphs', help: 'Footer invitation above the sign-up CTA.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_substack_prompt"]' },
    { key: 'shared_footer_substack_heading', page: 'Shared', section: 'footer', label: 'Substack heading', mode: 'text', help: 'Short heading immediately above the Substack CTA.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_substack_heading"]' },
    { key: 'shared_footer_substack_label', page: 'Shared', section: 'footer', label: 'Substack button label', mode: 'text', help: 'Visible label for the fixed Substack link.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_substack_label"]' },
    { key: 'shared_footer_copyright', page: 'Shared', section: 'footer', label: 'Copyright line', mode: 'text', help: 'Complete copyright line in the shared footer.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_copyright"]' },
    { key: 'shared_footer_tagline', page: 'Shared', section: 'footer', label: 'Footer tagline', mode: 'text', help: '"Made with love" line in the shared footer.', viewUrl: '/index.html', selector: '[data-site-content-key="shared_footer_tagline"]' }
  ];

  function validateRegistry(entries) {
    const seen = new Set();
    for (const entry of entries) {
      if (!entry || typeof entry.key !== 'string' || !entry.key || seen.has(entry.key) || !allowedModes.has(entry.mode)) throw new Error('Invalid content registry');
      if (!allowedPages.has(entry.page) || !entry.section || !entry.label || !entry.help || !entry.viewUrl || !entry.selector) throw new Error('Incomplete content registry entry');
      if (entry.viewUrl !== (entry.page === 'About' ? '/about-us.html' : '/index.html')) throw new Error('Invalid content registry URL');
      const expectedSelector = `[data-site-content-key="${entry.key}"]`;
      if (typeof entry.selector !== 'string' || !entry.selector.split(',').every((selector) => selector.trim() === expectedSelector)) throw new Error('Invalid content registry selector');
      const expectedMetadataRole = metadataRoles[entry.key];
      const hasMetadataRole = Object.prototype.hasOwnProperty.call(entry, 'metadataRole');
      if ((expectedMetadataRole && entry.metadataRole !== expectedMetadataRole) || (!expectedMetadataRole && hasMetadataRole)) throw new Error('Invalid content registry metadata role');
      seen.add(entry.key);
    }
  }

  validateRegistry(registry);
  global.HFT_CONTENT_REGISTRY = Object.freeze(registry.map(Object.freeze));
  global.HFT_CONTENT_BY_KEY = Object.freeze(Object.fromEntries(registry.map((entry) => [entry.key, entry])));
  global.HFT_CONTENT_REGISTRY_TEST_API = { validateRegistry };
})(window);
