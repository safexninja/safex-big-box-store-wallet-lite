module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Safex Ninja',
          homepage: 'https://safex.ninja'
        }
          
      },
    },
  
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
