import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
const topics = [
  'Career', 'Health', 'Finance', 'Relationships', 'Mindfulness', 'Fitness',
  'Productivity', 'Parenting', 'Mental Health', 'Faith', 'Prayer', 'Wisdom',
  'Love', 'Grace', 'Hope'
];

const prompts = {
  Career: [
    'Promotions',
    'Managing difficult situations at work',
    'God’s plan for my career',
    'Balancing work and personal life',
    'Finding purpose in my job'
  ],
  Health: [
    'Healing and recovery',
    'Maintaining physical health',
    'Overcoming illness',
    'Trusting God with my health',
    'Healthy living according to the Bible'
  ],
  Finance: [
    'Managing finances wisely',
    'Trusting God with my financial future',
    'Generosity and giving',
    'Overcoming financial stress',
    'Biblical principles of wealth'
  ],
  Relationships: [
    'Building strong friendships',
    'Resolving conflicts',
    'Godly romantic relationships',
    'Strengthening family bonds',
    'Loving others as Christ loves us'
  ],
  Mindfulness: [
    'Finding peace in God',
    'Living in the present moment',
    'Trusting God with my worries',
    'Meditating on God’s word',
    'Practicing gratitude'
  ],
  Fitness: [
    'Honoring God with my body',
    'Staying motivated to exercise',
    'Balancing fitness and faith',
    'Overcoming physical challenges',
    'Finding joy in physical activity'
  ],
  Productivity: [
    'Using time wisely',
    'Balancing work and rest',
    'Setting and achieving goals',
    'Staying focused on God’s priorities',
    'Overcoming procrastination'
  ],
  Parenting: [
    'Raising children in faith',
    'Balancing discipline and love',
    'Praying for my children',
    'Teaching biblical values',
    'Trusting God with my parenting'
  ],
  'Mental Health': [
    'Overcoming anxiety',
    'Finding peace in God',
    'Trusting God with my mental health',
    'Biblical encouragement for depression',
    'Renewing my mind with God’s word'
  ],
  Faith: [
    'Growing in faith',
    'Trusting God in difficult times',
    'Living out my faith daily',
    'Strengthening my relationship with God',
    'Sharing my faith with others'
  ],
  Prayer: [
    'Developing a prayer routine',
    'Praying for others',
    'Listening to God in prayer',
    'Praying with faith and confidence',
    'Thanksgiving and praise in prayer'
  ],
  Wisdom: [
    'Seeking God’s wisdom',
    'Making wise decisions',
    'Learning from biblical wisdom',
    'Applying wisdom in daily life',
    'Growing in understanding'
  ],
  Love: [
    'Loving others as Christ loves us',
    'God’s love for me',
    'Showing love in difficult situations',
    'Loving my enemies',
    'Growing in love'
  ],
  Grace: [
    'Understanding God’s grace',
    'Living in grace',
    'Showing grace to others',
    'Grace in difficult times',
    'Growing in grace'
  ],
  Hope: [
    'Finding hope in God',
    'Hope in difficult times',
    'Sharing hope with others',
    'Living with hope',
    'Biblical promises of hope'
  ]
};

interface ITopicIdeasProps {
  onChangePrompt: (prompt: string) => void;
}

const TopicIdeas = ({ onChangePrompt }: ITopicIdeasProps) => {
  const [selectedTopic, setSelectedTopic] = useState(null);

  return (
    <div className="p-3 row gap-2">
      {selectedTopic ? (
        <>
          <button
            type="button"
            className="btn btn-outline-secondary col-12 mb-2"
            onClick={() => setSelectedTopic(null)}
          >
            <i class="bi bi-arrow-left me-2"></i>
            Back
          </button>
          {prompts[selectedTopic].map((prompt) => (
            <button
              type="button"
              className="btn btn-outline-info col-12"
              key={prompt}
              onClick={() => onChangePrompt(prompt)}
            >
              {prompt}
            </button>
          ))}
        </>
      ) : (
        topics.map((topic) => (
          <button
            type="button"
            className="btn btn-outline-info col"
            key={topic}
            onClick={() => setSelectedTopic(topic)}
          >
            {topic}
          </button>
        ))
      )}
    </div>
  );
};

export default TopicIdeas;
