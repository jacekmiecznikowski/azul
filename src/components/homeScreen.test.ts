import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeScreen } from './HomeScreen'

const props = {
  hasSave: false, onContinue: () => {}, onNewGame: () => {}, onRules: () => {},
  musicEnabled: true, musicUnavailable: false, toggleMusic: () => {},
  soundEnabled: true, toggleSound: () => {},
  effectsEnabled: true, reducedMotion: false, toggleEffects: () => {},
}

describe('shared startup menu across Vite, EXE and APK', () => {
  it('opens to a main menu without implying an in-progress match', () => {
    const markup = renderToStaticMarkup(createElement(HomeScreen, props))
    expect(markup).toContain('Menu główne Sintra Glass')
    expect(markup).toContain('Nowa gra')
    expect(markup).toContain('Ustawienia')
    expect(markup).toContain('O twórcy')
    expect(markup).not.toContain('Kontynuuj partię')
  })
  it('shows continue only with a locally saved game', () => {
    const markup = renderToStaticMarkup(createElement(HomeScreen, {...props, hasSave: true}))
    expect(markup).toContain('Kontynuuj partię')
    expect(markup).toContain('Nowa gra')
  })
})
