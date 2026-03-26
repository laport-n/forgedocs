/**
 * Docsite configuration.
 *
 * Customize this file to match your organization.
 * All fields are optional — sensible defaults are used when omitted.
 */
export default {
  /** Site title shown in the header and browser tab */
  title: 'Docsite',

  /** Site description for SEO and metadata */
  description: 'Architecture documentation for your services',

  /** GitHub organization or user URL (shown as social link) */
  github: 'https://github.com/nlaporte/docsite',

  /**
   * Additional directories to scan for repos during setup.
   * The parent directory (`../`) is always scanned.
   * Paths support ~ for home directory.
   */
  scanDirs: [
    '~/working',
    '~/projects',
    '~/code',
    '~/src',
    '~/dev',
  ],

  /**
   * Subdirectory patterns to scan inside each found directory.
   * For example, if your repos live in ~/working/my-monorepo/services/,
   * add 'services' here.
   *
   * Default: ['apis', 'packages', 'services', 'apps', 'modules']
   */
  nestedDirs: ['apis', 'packages', 'services', 'apps', 'modules'],

  /**
   * Additional glob patterns to exclude from VitePress source processing.
   * These are appended to the built-in exclusions (node_modules, common
   * source directories, build artifacts, etc.).
   *
   * Example: ['content/*/my-custom-dir/**']
   */
  extraExcludes: [],
}
