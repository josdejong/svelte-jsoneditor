import dts from 'rollup-plugin-dts'

export default {
  input: 'package/index.d.ts',
  output: [
    {
      file: 'package/dist/jsoneditor.d.ts',
      format: 'es'
    }
  ],
  plugins: [dts()]
}
