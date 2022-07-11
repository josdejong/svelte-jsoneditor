import dts from 'rollup-plugin-dts'

export default {
  input: 'package/index.d.ts',
  output: [
    {
      file: 'package-vanilla/index.d.ts',
      format: 'es'
    }
  ],
  plugins: [
    dts({
      // we want to create a standalone bundle that does not have dependencies
      respectExternal: true
    })
  ]
}
