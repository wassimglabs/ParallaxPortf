import pavVideo from '../assets/videos/optimized/pav-1.mp4';
import juryVideo from '../assets/videos/optimized/jury-final-2.mp4';
import kineticVideo from '../assets/videos/optimized/kinetic-cut.mp4';
import raidVideo from '../assets/videos/optimized/raid-2026-doc.mp4';
import timeMentVideo from '../assets/videos/optimized/time-ment.mp4';
import timelineTwoVideo from '../assets/videos/optimized/timeline-1-2.mp4';
import timelineVideo from '../assets/videos/optimized/timeline-1.mp4';
import pavPoster from '../assets/videos/posters/pav-1.jpg';
import juryPoster from '../assets/videos/posters/jury-final-2.jpg';
import kineticPoster from '../assets/videos/posters/kinetic-cut.jpg';
import raidPoster from '../assets/videos/posters/raid-2026-doc.jpg';
import timeMentPoster from '../assets/videos/posters/time-ment.jpg';
import timelineTwoPoster from '../assets/videos/posters/timeline-1-2.jpg';
import timelinePoster from '../assets/videos/posters/timeline-1.jpg';

import storyImage01 from '../assets/images/optimized/1.jpg';
import storyImage02 from '../assets/images/optimized/2.jpg';
import storyImage03 from '../assets/images/optimized/3.jpg';
import storyImage04 from '../assets/images/optimized/4.jpg';
import storyImage05 from '../assets/images/optimized/5.jpg';
import storyImage06 from '../assets/images/optimized/6.jpg';
import storyImage07 from '../assets/images/optimized/7.jpg';
import storyImage08 from '../assets/images/optimized/8.jpg';
import storyImage09 from '../assets/images/optimized/9.jpg';
import storyImage10 from '../assets/images/optimized/10.jpg';
import storyImage11 from '../assets/images/optimized/11.jpg';
import storyImage12 from '../assets/images/optimized/12.jpg';
import storyImage13 from '../assets/images/optimized/13.jpg';
import storyImage14 from '../assets/images/optimized/14.jpg';

export const storyImages = [
  storyImage01,
  storyImage02,
  storyImage03,
  storyImage04,
  storyImage05,
  storyImage06,
  storyImage07,
  storyImage08,
  storyImage09,
  storyImage10,
  storyImage11,
  storyImage12,
  storyImage13,
  storyImage14,
];

const placeholderWork = [
  {
    id: 1,
    slug: 'pav-1',
    client: 'PAV',
    title: '2 Pav 1',
    video: pavVideo,
    poster: pavPoster,
    width: 210,
    type: 'Commercial',
    editor: 'Oussema Hanzouti',
    description:
      'A local edit from the portfolio archive, presented with the original video asset.',
    credits: [
      ['Production Company', 'PAV'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
  {
    id: 2,
    slug: 'jury-final-2',
    client: 'JURY',
    title: 'Final 2',
    video: juryVideo,
    poster: juryPoster,
    width: 185,
    type: 'Short Film',
    editor: 'Oussema Hanzouti',
    description:
      'A finished cut from the local video collection, carried through the landing, index, and detail view.',
    credits: [
      ['Production Company', 'Jury'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
  {
    id: 3,
    slug: 'kinetic-cut',
    client: 'KINETIC',
    title: 'Cut',
    video: kineticVideo,
    poster: kineticPoster,
    width: 205,
    type: 'Campaign',
    editor: 'Oussema Hanzouti',
    description:
      'A fast portfolio piece using the supplied local media asset as the source.',
    credits: [
      ['Production Company', 'Kinetic'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
  {
    id: 4,
    slug: 'raid-2026-doc',
    client: 'RAID',
    title: '2026 Doc',
    video: raidVideo,
    poster: raidPoster,
    width: 195,
    type: 'Documentary',
    editor: 'Oussema Hanzouti',
    description:
      'A documentary entry wired directly to the RAID 2026 DOC video in the assets folder.',
    credits: [
      ['Production Company', 'RAID'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
  {
    id: 5,
    slug: 'time-ment',
    client: 'TIME',
    title: 'Ment',
    video: timeMentVideo,
    poster: timeMentPoster,
    width: 190,
    type: 'Brand Film',
    editor: 'Oussema Hanzouti',
    description:
      'A measured portfolio film sourced from the local TIME MENT asset.',
    credits: [
      ['Production Company', 'Time'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
  {
    id: 6,
    slug: 'timeline-1-2',
    client: 'TIMELINE',
    title: '1.2',
    video: timelineTwoVideo,
    poster: timelineTwoPoster,
    width: 230,
    type: 'Commercial',
    editor: 'Oussema Hanzouti',
    description:
      'A Timeline edit using the MP4 asset already included in the project.',
    credits: [
      ['Production Company', 'Timeline'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
  {
    id: 7,
    slug: 'timeline-1',
    client: 'TIMELINE',
    title: '1',
    video: timelineVideo,
    poster: timelinePoster,
    width: 205,
    type: 'Music Video',
    editor: 'Oussema Hanzouti',
    description:
      'A companion Timeline piece connected to the original local video file.',
    credits: [
      ['Production Company', 'Timeline'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
  {
    id: 8,
    slug: 'image-story',
    client: 'STORY',
    title: '1-14',
    images: storyImages,
    width: 185,
    type: 'Image Story',
    editor: 'Oussema Hanzouti',
    position: 'Editor / Sequence',
    description:
      'A fourteen-image story played in order as one continuous piece, from image 1 through image 14.',
    credits: [
      ['Production Company', 'Story'],
      ['Editor', 'Oussema Hanzouti'],
    ],
  },
];

export default placeholderWork;
