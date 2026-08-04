-- OPERATOR PREFLIGHT — run this file manually in the Supabase SQL editor.
-- STOP before BEGIN unless every required capability below is confirmed. Do not
-- add grants or change RLS/policies from this file; have a database operator
-- correct any missing prerequisite separately, then rerun these read-only checks.

-- 1. `ON CONFLICT (key)` needs a primary/unique constraint on key alone.
SELECT c.conname, c.contype, key_column.attname
FROM pg_constraint AS c
JOIN pg_class AS t ON t.oid = c.conrelid
JOIN pg_namespace AS n ON n.oid = t.relnamespace
JOIN pg_attribute AS key_column ON key_column.attrelid = t.oid
WHERE n.nspname = 'public'
  AND t.relname = 'site_content'
  AND key_column.attname = 'key'
  AND c.contype IN ('p', 'u')
  AND c.conkey = ARRAY[key_column.attnum];

-- 2. The public table must have RLS enabled.
SELECT n.nspname, t.relname, t.relrowsecurity
FROM pg_class AS t
JOIN pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'site_content';

-- 3. Data API table privileges must be explicit. Every row must be present.
WITH required_grants (grantee, privilege_type) AS (
  VALUES
    ('anon', 'SELECT'),
    ('authenticated', 'SELECT'),
    ('authenticated', 'INSERT'),
    ('authenticated', 'UPDATE')
)
SELECT required_grants.grantee, required_grants.privilege_type,
       EXISTS (
         SELECT 1
         FROM information_schema.role_table_grants AS grants
         WHERE grants.table_schema = 'public'
           AND grants.table_name = 'site_content'
           AND grants.grantee = required_grants.grantee
           AND grants.privilege_type = required_grants.privilege_type
       ) AS granted
FROM required_grants
ORDER BY required_grants.grantee, required_grants.privilege_type;

-- 4. RLS policies must effectively permit the same operations. Policies for
-- `public` are effective for anon/authenticated. Inspect qual/with_check too.
WITH required_policies (role_name, command) AS (
  VALUES
    ('anon', 'SELECT'),
    ('authenticated', 'SELECT'),
    ('authenticated', 'INSERT'),
    ('authenticated', 'UPDATE')
)
SELECT required_policies.role_name, required_policies.command,
       policy.policyname, policy.roles, policy.cmd, policy.qual, policy.with_check,
       policy.policyname IS NOT NULL AS effective
FROM required_policies
LEFT JOIN LATERAL (
  SELECT policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'site_content'
    AND (roles && ARRAY[required_policies.role_name::name, 'public'::name])
    AND cmd IN (required_policies.command, 'ALL')
) AS policy ON TRUE
ORDER BY required_policies.role_name, required_policies.command, policy.policyname;

-- STOP if query 1 has no single-column primary or unique key, query 2 does not
-- show RLS enabled, any grant is false, or any required policy is ineffective.
-- Only after those conditions are satisfied should the transaction run.
BEGIN;

INSERT INTO public.site_content AS site_content (key, body)
VALUES
  ('shared_promo_cta', 'View Pop-Ups'),
  ('shared_notice_heading', 'Due to the snowstorm'),
  ('shared_notice_body', 'Thaliwala will be Closing on Wed, Feb 22 & Thursday, Feb 23.Thank you for understanding.'),
  ('shared_nav_home_label', 'Home'),
  ('shared_nav_popups_label', 'Pop-Ups'),
  ('shared_nav_about_label', 'About us'),
  ('home_hero_heading', 'b''fast tacos by texans, for texans'),
  ('home_hero_subtitle', '(and everyone else)'),
  ('home_hero_intro', 'Hard Feelings Tacos is Rebecca Gorena''s breakfast-taco love letter, brought to life through pop-ups across New York City. Rooted in her Texan upbringing, the project is all about the flavors she grew up with on the Texas-Mexico border and in Austin—papa con huevo, chorizo and egg, migas—served fresh on warm tortillas. Each pop-up is more than a meal: it''s a gathering, a chance to share food that feels like home, and a way to carry Texas breakfast culture into Brooklyn''s markets and community spaces. Hard Feelings is about cooking with care, honoring tradition, and serving tacos that taste as good as they make you feel.'),
  ('home_hero_cta', 'View Pop-ups'),
  ('home_marquee_chorizo', 'chorizo'),
  ('home_marquee_huevos', 'huevos'),
  ('home_marquee_papas', 'papas'),
  ('home_marquee_frijoles', 'frijoles'),
  ('home_marquee_tortillas', 'tortillas'),
  ('home_marquee_queso', 'queso'),
  ('home_marquee_salsa', 'salsa'),
  ('home_marquee_cebollas', 'cebollas'),
  ('home_marquee_jalapenos', 'jalapeños'),
  ('home_menu_image_caption', 'Pictured: Man! I Feel Like a Vegan'),
  ('home_menu_chorizo_title', 'Chorizo Egg & Cheese'),
  ('home_menu_chorizo_description', 'Spicy Dickson''s Mexican chorizo cooked with fluffy eggs and melted Jack cheese, a bold and hearty breakfast classic wrapped in a warm tortilla.'),
  ('home_menu_papas_title', 'Papas con Huevo(Veg)'),
  ('home_menu_papas_description', 'Crispy spiced potatoes and soft scrambled eggs with creamy frijoles and Jack cheese—a Texan comfort favorite that''s simple, filling, and always satisfying.'),
  ('home_menu_vegan_title', 'Man! I FeelLike a Vegan(V)'),
  ('home_menu_vegan_description', 'Fried spiced potatoes and savory frijoles layered with pickled red onions, peppers, and tomato—bright, tangy, and completely plant-based.'),
  ('home_values_heading', 'ourValues'),
  ('home_values_body', 'Lorem ipsum dolor sit amet consectetur. Sed tortor diam eget nibh aliquam diam pharetra. Odio enim quis massa ac at vitae ultricies interdum. Massa adipiscing orci cras laoreet congue tristique sit. 

Lorem ipsum dolor sit amet consectetur. Sed tortor diam eget nibh aliquam diam pharetra. Odio enim quis massa ac at vitae ultricies interdum. Massa adipiscing orci cras laoreet congue tristique sit.'),
  ('home_values_cta', 'learn more about us'),
  ('home_popups_heading', 'Pop-Ups'),
  ('home_popups_upcoming_label', 'Upcoming'),
  ('home_popups_past_label', 'Past'),
  ('home_host_heading', 'Want to host a pop-up?'),
  ('home_host_body', 'Hard Feelings Tacos partners with coffee shops, small businesses, and community spaces across New York City to bring the flavors of Texas breakfast tacos to new tables. These pop-ups turn everyday spots into gatherings, where warm tortillas meet good people.

Whether it''s a café, a neighborhood shop, or a community event, we love showing up with tacos that make everyone feel at home. If you''d like to host a pop-up, let''s talk.'),
  ('home_host_name_placeholder', 'Your name'),
  ('home_host_email_placeholder', 'Your email address'),
  ('home_host_details_placeholder', 'Tell us about your event! Include: event type, date, location, expected number of people, and any special requests.'),
  ('home_host_submit_label', 'Send Pop-up Request'),
  ('about_heading', 'About Hard Feelings Tacos'),
  ('about_intro', 'Rebecca Gorena is the cook behind Hard Feelings Tacos, a pop-up project bringing authentic Texas-style breakfast tacos to New York City. Raised on the Texas–Mexico border and seasoned by fourteen years in Austin, Rebecca carries the flavors of home into every tortilla she makes—papa con huevo, chorizo and egg, migas, and more.'),
  ('about_bio', 'When she moved to Brooklyn, she brought those traditions with her, turning neighborhood coffee shops and local markets into spaces where New Yorkers could experience the comfort of a real Texas breakfast taco. Each pop-up is more than just a meal—it''s a chance to gather, to slow down, and to feel at home, even far from Texas.

Rebecca is also a writer and educator. She is pursuing a master''s in Food Studies at NYU, teaches cooking classes at the Park Slope Food Coop, and shares stories and recipes through her Substack. For her, tacos aren''t just food—they are memory, care, and connection. Cooking is a way to honor heritage, nurture chosen family, and create community one tortilla at a time.

Hard Feelings Tacos is Rebecca''s love letter to the flavors she grew up with, written from a Brooklyn kitchen with no natural light but plenty of heart.'),
  ('about_follow_heading', 'Follow Rebecca'),
  ('about_follow_body', 'Follow Rebecca''s culinary journey through her Substack "Chosen Family Meal" where she explores cookbooks, diaspora recipes, food history, and local cuisine. You can also follow her on Instagram @rebeccacantbake for behind-the-scenes content, cooking tips, and more of her food adventures.'),
  ('about_follow_substack_label', 'Substack'),
  ('about_follow_instagram_label', 'Instagram'),
  ('shared_banner_badge', '1 YEAR!'),
  ('shared_banner_message', 'Anniversary Pop-Up · Sun May 24 · 11am ‘til sold out @ Phil’s Brooklyn'),
  ('shared_footer_contact_heading', 'Get In Touch'),
  ('shared_footer_email_label', 'Email Us'),
  ('shared_footer_email_action', 'contact'),
  ('shared_footer_host_label', 'Host a Pop-up'),
  ('shared_footer_host_action', 'request'),
  ('shared_footer_instagram_label', 'Instagram'),
  ('shared_footer_instagram_action', 'follow'),
  ('shared_footer_navigation_heading', 'Navigation'),
  ('shared_footer_home_label', 'Home'),
  ('shared_footer_home_action', 'visit'),
  ('shared_footer_popups_label', 'Pop-Ups'),
  ('shared_footer_popups_action', 'view'),
  ('shared_footer_about_label', 'About Us'),
  ('shared_footer_about_action', 'visit'),
  ('shared_footer_substack_prompt', 'Join Rebecca''s Substack for updates on Hard Feelings Tacos pop-ups, recipes, and behind-the-scenes stories.'),
  ('shared_footer_substack_heading', 'Join Rebecca''s Substack'),
  ('shared_footer_substack_label', 'Join Substack'),
  ('shared_footer_copyright', '© 2024 Hard Feelings Tacos. All Rights Reserved.'),
  ('shared_footer_tagline', 'Made with love in New York City')
ON CONFLICT (key) DO UPDATE
SET body = EXCLUDED.body
WHERE btrim(site_content.body) = '';

COMMIT;
