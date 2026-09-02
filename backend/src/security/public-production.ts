/**
 * Explicit public projections for the showcase API.
 *
 * The production workspace needs rich records, but anonymous visitors only
 * need editorial metadata and browser-playable media. Keeping this allowlist
 * here prevents newly-added internal columns from becoming public by default.
 */
export function publicDramaRecord(row: Record<string, any>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    style: row.style,
    total_episodes: row.totalEpisodes,
    total_duration: row.totalDuration,
    status: row.status,
    thumbnail: row.thumbnail,
    updated_at: row.updatedAt,
  }
}

export function publicEpisodeRecord(row: Record<string, any>) {
  return {
    id: row.id,
    episode_number: row.episodeNumber,
    title: row.title,
    description: row.description,
    duration: row.duration,
    status: row.status,
    video_url: row.videoUrl,
    thumbnail: row.thumbnail,
    script_ready: Boolean(row.scriptContent || row.content),
    updated_at: row.updatedAt,
  }
}

export function publicCharacterRecord(row: Record<string, any>) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    image_url: row.imageUrl,
  }
}

export function publicSceneRecord(row: Record<string, any>) {
  return {
    id: row.id,
    location: row.location,
    time: row.time,
    image_url: row.imageUrl,
    status: row.status,
  }
}

export function publicPropRecord(row: Record<string, any>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    image_url: row.imageUrl,
  }
}

export function publicStoryboardRecord(row: Record<string, any>) {
  return {
    id: row.id,
    episode_id: row.episodeId,
    storyboard_number: row.storyboardNumber,
    title: row.title,
    location: row.location,
    time: row.time,
    shot_type: row.shotType,
    angle: row.angle,
    movement: row.movement,
    action: row.action,
    result: row.result,
    atmosphere: row.atmosphere,
    dialogue: row.dialogue,
    description: row.description,
    duration: row.duration,
    composed_image: row.composedImage,
    first_frame_image: row.firstFrameImage,
    last_frame_image: row.lastFrameImage,
    video_url: row.videoUrl,
    composed_video_url: row.composedVideoUrl,
    status: row.status,
  }
}

export function publicMergeRecord(row: Record<string, any>) {
  return {
    status: row.status,
    merged_url: row.mergedUrl,
    duration: row.duration,
    completed_at: row.completedAt,
  }
}
