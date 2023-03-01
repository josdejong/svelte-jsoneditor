import { sortBy } from 'lodash-es'
import { ARRAY_SECTION_SIZE } from '../constants.js'
import type { Section } from '$lib/types.js'

/**
 * Create sections that can be expanded.
 * Used to display a button like "Show items 100-200"
 */
export function getExpandItemsSections(startIndex: number, endIndex: number): Section[] {
  // expand the start of the section
  const section1 = {
    start: startIndex,
    end: Math.min(nextRoundNumber(startIndex), endIndex)
  }

  // expand the middle of the section
  const start2 = Math.max(currentRoundNumber((startIndex + endIndex) / 2), startIndex)
  const section2 = {
    start: start2,
    end: Math.min(nextRoundNumber(start2), endIndex)
  }

  // expand the end of the section
  const currentIndex = currentRoundNumber(endIndex)
  const previousIndex = currentIndex === endIndex ? currentIndex - ARRAY_SECTION_SIZE : currentIndex
  const section3 = {
    start: Math.max(previousIndex, startIndex),
    end: endIndex
  }

  const sections = [section1]

  const showSection2 = section2.start >= section1.end && section2.end <= section3.start
  if (showSection2) {
    sections.push(section2)
  }

  const showSection3 = section3.start >= (showSection2 ? section2.end : section1.end)
  if (showSection3) {
    sections.push(section3)
  }

  return sections
}

/**
 * Sort and merge a list with sections
 */
export function mergeSections(sections: Section[]): Section[] {
  const sortedSections = sortBy(sections, (section) => section.start)

  const mergedSections = [sortedSections[0]]

  for (let sortedIndex = 0; sortedIndex < sortedSections.length; sortedIndex++) {
    const mergedIndex = mergedSections.length - 1
    const previous = mergedSections[mergedIndex]
    const current = sortedSections[sortedIndex]

    if (current.start <= previous.end) {
      // there is overlap -> replace the previous item
      mergedSections[mergedIndex] = {
        start: Math.min(previous.start, current.start),
        end: Math.max(previous.end, current.end)
      }
    } else {
      // no overlap, just add the item
      mergedSections.push(current)
    }
  }

  return mergedSections
}

// TODO: write unit test
export function inVisibleSection(sections: Section[], index: number): boolean {
  return sections.some((section) => {
    return index >= section.start && index < section.end
  })
}

export function nextRoundNumber(index: number): number {
  return currentRoundNumber(index) + ARRAY_SECTION_SIZE
}

export function currentRoundNumber(index: number): number {
  return Math.floor(index / ARRAY_SECTION_SIZE) * ARRAY_SECTION_SIZE
}
