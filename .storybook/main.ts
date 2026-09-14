import type { StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(js|ts|svelte)"
  ],
  addons: [
    "@storybook/addon-svelte-csf"
  ],
  framework: "@storybook/svelte-vite",
  core: {
    disableTelemetry: true,
    disableWhatsNewNotifications: true
  },
  features: {
    sidebarOnboardingChecklist: false
  }
};
export default config;