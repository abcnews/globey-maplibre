import type { StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts|svelte)'],
  addons: ['@storybook/addon-svelte-csf'],
  framework: '@storybook/svelte-vite',
  core: {
    disableTelemetry: true,
    disableWhatsNewNotifications: true,
    // @ts-expect-error storybook 10 core option
    allowedHosts: true
  },
  features: {
    sidebarOnboardingChecklist: false
  },
  async viteFinal(config) {
    config.server = {
      ...config.server,
      allowedHosts: true
    };
    config.publicDir = 'public';
    return config;
  }
};
export default config;
