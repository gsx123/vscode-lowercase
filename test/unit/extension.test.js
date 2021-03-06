/* global setup, suite, teardown, test */

const { Position, Range, Selection } = require('vscode')
const assert = require('assert')
const isEqual = require('lodash.isequal')
const lowercase = require('extension')
const proxyquire = require('proxyquire')
const td = require('testdouble')

suite('unit tests', () => {
  teardown('reset fakes', () => {
    td.reset()
  })

  suite('activate', () => {
    test('calls the `toLowerCase` command', () => {
      const context = { subscriptions: [] }
      const disposable = { foo: 'bar' }
      const registerTextEditorCommand = td.function()
      const lowercase = proxyquire('extension', {
        vscode: {
          commands: { registerTextEditorCommand }
        }
      })

      td.when(registerTextEditorCommand('lowercase.toLowerCase', lowercase.toLowerCase))
        .thenReturn(disposable)

      lowercase.activate(context)

      assert.deepEqual(context, { subscriptions: [disposable] }, 'adds extension to the subscriptions')
    })
  })

  suite('toLowerCase', () => {
    let edit, getText, replace

    setup('create fakes', () => {
      edit = td.function()
      getText = td.function()
      replace = td.function()
    })

    test('does nothing if there are no selections', () => {
      td.when(edit(td.callback({ replace }))).thenResolve(true)

      return lowercase.toLowerCase({ edit, selections: [] }).then(() => {
        td.verify(getText(), { ignoreExtraArgs: true, times: 0 })
        td.verify(replace(), { ignoreExtraArgs: true, times: 0 })
      })
    })

    test('does nothing for empty selections', () => {
      const selection = new Selection(new Position(0, 0), new Position(0, 0))
      const range = new Range(selection.start, selection.end)
      const editor = { document: { getText }, edit, selections: [selection] }

      td.when(edit(td.callback({ replace }))).thenResolve(true)
      td.when(getText(td.matchers.argThat(r => isEqual(r, range)))).thenReturn('')

      return lowercase.toLowerCase(editor).then(() => {
        td.verify(replace(), { ignoreExtraArgs: true, times: 0 })
      })
    })

    test('does nothing for selections not containing alphabetic characters', () => {
      const selection = new Selection(new Position(0, 0), new Position(0, 2))
      const range = new Range(selection.start, selection.end)
      const editor = { document: { getText }, edit, selections: [selection] }

      td.when(edit(td.callback({ replace }))).thenResolve(true)
      td.when(getText(td.matchers.argThat(r => isEqual(r, range)))).thenReturn(' 1*')

      return lowercase.toLowerCase(editor).then(() => {
        td.verify(replace(), { ignoreExtraArgs: true, times: 0 })
      })
    })

    test('converts multiple non-empty selections to lowercase', () => {
      // Editor contents:
      // FOO BAR
      const start1 = new Position(0, 0)
      const start2 = new Position(0, 4)
      const end1 = new Position(0, 2)
      const end2 = new Position(0, 6)
      const selection1 = new Selection(start1, end1)
      const selection2 = new Selection(start2, end2)
      const editor = { document: { getText }, edit, selections: [selection1, selection2] }

      td.when(edit(td.callback({ replace }))).thenResolve(true)
      td.when(getText(new Range(start1, end1))).thenReturn('FOO')
      td.when(getText(new Range(start2, end2))).thenReturn('BAR')

      return lowercase.toLowerCase(editor).then(() => {
        td.verify(replace(selection1, 'foo'), { times: 1 })
        td.verify(replace(selection2, 'bar'), { times: 1 })
      })
    })

    test('converts single multi-line selections to lowercase', () => {
      // Editor contents:
      // FOO
      //
      // BAR
      const start = new Position(0, 0)
      const end = new Position(2, 4)
      const selection = new Selection(start, end)
      const editor = { document: { getText }, edit, selections: [selection] }

      td.when(edit(td.callback({ replace }))).thenResolve(true)
      td.when(getText(new Range(start, end))).thenReturn('FOO\nBAR')

      return lowercase.toLowerCase(editor).then(() => {
        td.verify(replace(selection, 'foo\nbar'), { times: 1 })
      })
    })
  })

  suite('deactivate', () => {
    test('returns `undefined`', () => {
      assert.equal(lowercase.deactivate(), undefined)
    })
  })
})
