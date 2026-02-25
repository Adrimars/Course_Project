// Manual Jest mock for uuid (ESM-only v13+ is not compatible with Jest CJS mode)
module.exports = {
  v4: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  v1: () => '00000000-0000-0000-0000-000000000001',
  v3: () => '00000000-0000-3000-a000-000000000000',
  v5: () => '00000000-0000-5000-a000-000000000000',
};
