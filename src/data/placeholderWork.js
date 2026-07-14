import pavVideo from '../assets/videos/optimized/pav-1.mp4';
import juryVideo from '../assets/videos/optimized/jury-final-2.mp4';
import kineticVideo from '../assets/videos/optimized/kinetic-cut.mp4';
import raidVideo from '../assets/videos/optimized/raid-2026-doc.mp4';
import timeMentVideo from '../assets/videos/optimized/time-ment.mp4';
import timelineTwoVideo from '../assets/videos/optimized/timeline-1-2.mp4';
import timelineVideo from '../assets/videos/optimized/timeline-1.mp4';

import storyImage01 from '../assets/images/1.JPG';
import storyImage02 from '../assets/images/2.JPG';
import storyImage03 from '../assets/images/3.JPG';
import storyImage04 from '../assets/images/4.JPG';
import storyImage05 from '../assets/images/5.JPG';
import storyImage06 from '../assets/images/6.JPG';
import storyImage07 from '../assets/images/7.JPG';
import storyImage08 from '../assets/images/8.JPG';
import storyImage09 from '../assets/images/9.JPG';
import storyImage10 from '../assets/images/10.JPG';
import storyImage11 from '../assets/images/11.JPG';
import storyImage12 from '../assets/images/12.JPG';
import storyImage13 from '../assets/images/13.JPG';
import storyImage14 from '../assets/images/14.JPG';

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
