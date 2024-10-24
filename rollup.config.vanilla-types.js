import dts from 'rollup-plugin-dts'

export default {
  input: 'package/index-vanilla.d.ts',
  output: [
    {
      file: 'package-vanilla/index.d.ts',
      format: 'es'
    },
    {
      file: 'package-vanilla/standalone.d.ts',
      format: 'es'
    }
  ],
  plugins: [dts()]
}
